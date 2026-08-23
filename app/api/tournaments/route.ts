import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../auth/_db";

const COOKIE = "ludo_session";

async function user(q: NextRequest) {
  const token = q.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await pool.query(
    "SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1",
    [hash]
  );
  return result.rows[0] || null;
}

function rounds(maxPlayers: number) {
  let n = Math.max(2, maxPlayers);
  let count = 0;
  while (n > 1) {
    n = Math.ceil(n / 4);
    count++;
  }
  return Math.max(1, count);
}

async function makeMatch(client: any, tournamentId: string, roundNo: number, matchNo: number) {
  const code = `T-${tournamentId.slice(0, 7).toUpperCase()}-${roundNo}-${matchNo}`.slice(0, 24);
  const result = await client.query(
    `INSERT INTO ludo_tournament_matches
      (tournament_id, round_no, match_no, room_code)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT(tournament_id,round_no,match_no)
     DO UPDATE SET room_code=EXCLUDED.room_code
     RETURNING *`,
    [tournamentId, roundNo, matchNo, code]
  );
  return result.rows[0];
}

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    const currentUser = await user(q);

    const tournamentsResult = await pool.query(
      `SELECT t.*,
              COUNT(e.user_id)::int AS players_count,
              MAX(CASE WHEN e.user_id=$1 THEN 1 ELSE 0 END)::int AS joined
       FROM ludo_tournaments t
       LEFT JOIN ludo_tournament_entries e ON e.tournament_id=t.id
       WHERE t.status NOT IN ('draft','cancelled')
       GROUP BY t.id
       ORDER BY t.starts_at ASC`,
      [currentUser?.id || null]
    );

    let mine: any[] = [];
    let matches: any[] = [];

    if (currentUser) {
      mine = (
        await pool.query(
          `SELECT e.tournament_id,e.status,e.joined_at,
                  t.name,t.status AS tournament_status
           FROM ludo_tournament_entries e
           JOIN ludo_tournaments t ON t.id=e.tournament_id
           WHERE e.user_id=$1
           ORDER BY e.joined_at DESC`,
          [currentUser.id]
        )
      ).rows;

      matches = (
        await pool.query(
          `SELECT m.*,t.name,t.max_players,t.prizes
           FROM ludo_tournament_matches m
           JOIN ludo_tournaments t ON t.id=m.tournament_id
           WHERE m.player_ids @> $1::jsonb
             AND m.status <> 'finished'
           ORDER BY m.round_no,m.match_no`,
          [JSON.stringify([currentUser.id])]
        )
      ).rows;
    }

    return NextResponse.json({
      tournaments: tournamentsResult.rows,
      mine,
      matches,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Tournament service unavailable." },
      { status: 500 }
    );
  }
}

export async function POST(q: NextRequest) {
  const client = await pool.connect();

  try {
    await ensureAuthSchema();
    const currentUser = await user(q);

    if (!currentUser || currentUser.is_guest || currentUser.is_banned) {
      return NextResponse.json(
        { error: "You must be signed in to enter tournaments." },
        { status: 401 }
      );
    }

    const body = await q.json();
    const action = String(body.action || "");

    if (action === "join") {
      const tournamentId = String(body.tournamentId || "");
      await client.query("BEGIN");

      const tournamentResult = await client.query(
        "SELECT * FROM ludo_tournaments WHERE id=$1 FOR UPDATE",
        [tournamentId]
      );

      if (!tournamentResult.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Tournament not found." }, { status: 404 });
      }

      const tournament = tournamentResult.rows[0];
      if (
        (tournament.status !== "open" && tournament.status !== "live") ||
        new Date(tournament.ends_at) <= new Date()
      ) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "This tournament is not open for entry." },
          { status: 400 }
        );
      }

      const existing = await client.query(
        "SELECT 1 FROM ludo_tournament_entries WHERE tournament_id=$1 AND user_id=$2",
        [tournamentId, currentUser.id]
      );

      if (existing.rowCount) {
        const old = await client.query(
          `SELECT room_code,round_no,match_no,status
           FROM ludo_tournament_matches
           WHERE tournament_id=$1 AND player_ids @> $2::jsonb
           ORDER BY round_no DESC,match_no
           LIMIT 1`,
          [tournamentId, JSON.stringify([currentUser.id])]
        );
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "You already entered this tournament.", match: old.rows[0] || null },
          { status: 409 }
        );
      }

      const countResult = await client.query(
        "SELECT COUNT(*)::int AS n FROM ludo_tournament_entries WHERE tournament_id=$1",
        [tournamentId]
      );
      const playerCount = Number(countResult.rows[0].n);

      if (playerCount >= Number(tournament.max_players)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Tournament is full." }, { status: 409 });
      }

      const entryCoins = Number(tournament.entry_fee_coins);
      const entryGems = Number(tournament.entry_fee_gems);
      const wallet = await client.query(
        "SELECT coins,gems FROM ludo_users WHERE id=$1 FOR UPDATE",
        [currentUser.id]
      );
      const coinsBefore = Number(wallet.rows[0].coins);
      const gemsBefore = Number(wallet.rows[0].gems);

      if (coinsBefore < entryCoins || gemsBefore < entryGems) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Insufficient balance for the tournament entry fee." },
          { status: 402 }
        );
      }

      if (entryCoins) {
        await client.query("UPDATE ludo_users SET coins=coins-$1 WHERE id=$2", [entryCoins, currentUser.id]);
      }
      if (entryGems) {
        await client.query("UPDATE ludo_users SET gems=gems-$1 WHERE id=$2", [entryGems, currentUser.id]);
      }

      await client.query(
        "INSERT INTO ludo_tournament_entries(tournament_id,user_id,seed) VALUES($1,$2,$3)",
        [tournamentId, currentUser.id, playerCount + 1]
      );

      if (entryCoins) {
        await client.query(
          `INSERT INTO ludo_admin_ledger
           (user_id,currency,amount,balance_before,balance_after,reason,source)
           VALUES($1,'coins',$2,$3,$4,$5,'tournament')`,
          [currentUser.id, -entryCoins, coinsBefore, coinsBefore - entryCoins, `Tournament entry: ${tournament.name}`]
        );
      }

      if (entryGems) {
        await client.query(
          `INSERT INTO ludo_admin_ledger
           (user_id,currency,amount,balance_before,balance_after,reason,source)
           VALUES($1,'gems',$2,$3,$4,$5,'tournament')`,
          [currentUser.id, -entryGems, gemsBefore, gemsBefore - entryGems, `Tournament entry: ${tournament.name}`]
        );
      }

      const matchesResult = await client.query(
        `SELECT * FROM ludo_tournament_matches
         WHERE tournament_id=$1 AND round_no=1
           AND status IN ('waiting','ready')
         ORDER BY match_no`,
        [tournamentId]
      );

      let match = matchesResult.rows.find(
        (item: any) => Array.isArray(item.player_ids) && item.player_ids.length < 4
      );

      if (!match) {
        match = await makeMatch(client, tournamentId, 1, matchesResult.rows.length + 1);
      }

      const playerIds = Array.isArray(match.player_ids) ? match.player_ids : [];
      playerIds.push(currentUser.id);
      const ready = playerIds.length >= 4;

      await client.query(
        "UPDATE ludo_tournament_matches SET player_ids=$1,status=$2 WHERE id=$3",
        [JSON.stringify(playerIds), ready ? "ready" : "waiting", match.id]
      );

      await client.query(
        `UPDATE ludo_tournaments
         SET updated_at=NOW(),
             status=CASE WHEN status='open' AND $2>=max_players THEN 'live' ELSE status END
         WHERE id=$1`,
        [tournamentId, playerCount + 1]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        ok: true,
        tournament,
        match: { ...match, player_ids: playerIds, status: ready ? "ready" : "waiting" },
        roomCode: match.room_code,
        roomSize: 4,
      });
    }

    if (action === "result") {
      const tournamentId = String(body.tournamentId || "");
      const matchId = Number(body.matchId);
      const winnerId = String(body.winnerId || "");

      await client.query("BEGIN");

      const matchResult = await client.query(
        `SELECT m.*,t.max_players,t.prizes,t.name
         FROM ludo_tournament_matches m
         JOIN ludo_tournaments t ON t.id=m.tournament_id
         WHERE m.id=$1 AND m.tournament_id=$2
         FOR UPDATE`,
        [matchId, tournamentId]
      );

      if (!matchResult.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Match not found." }, { status: 404 });
      }

      const match = matchResult.rows[0];
      const playerIds = Array.isArray(match.player_ids) ? match.player_ids : [];

      if (!playerIds.includes(currentUser.id) || !playerIds.includes(winnerId)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Invalid tournament result." }, { status: 403 });
      }

      if (match.status === "finished") {
        await client.query("ROLLBACK");
        return NextResponse.json({ ok: true, alreadyProcessed: true });
      }

      const roundNo = Number(match.round_no);
      const matchNo = Number(match.match_no);
      const finalRound = rounds(Number(match.max_players));

      await client.query(
        "UPDATE ludo_tournament_matches SET status='finished',winner_id=$1,completed_at=NOW() WHERE id=$2",
        [winnerId, matchId]
      );

      for (const playerId of playerIds) {
        if (playerId !== winnerId) {
          await client.query(
            `UPDATE ludo_tournament_entries
             SET status='eliminated',eliminated_at=NOW()
             WHERE tournament_id=$1 AND user_id=$2`,
            [tournamentId, playerId]
          );
        }
      }

      if (roundNo < finalRound) {
        const nextMatchNo = Math.ceil(matchNo / 4);
        const nextResult = await client.query(
          `SELECT * FROM ludo_tournament_matches
           WHERE tournament_id=$1 AND round_no=$2 AND match_no=$3
           FOR UPDATE`,
          [tournamentId, roundNo + 1, nextMatchNo]
        );

        const nextMatch = nextResult.rowCount
          ? nextResult.rows[0]
          : await makeMatch(client, tournamentId, roundNo + 1, nextMatchNo);

        const nextPlayerIds = Array.isArray(nextMatch.player_ids) ? nextMatch.player_ids : [];
        if (!nextPlayerIds.includes(winnerId)) nextPlayerIds.push(winnerId);

        const nextReady =
          (roundNo + 1 === finalRound && nextPlayerIds.length >= 2) ||
          (roundNo + 1 < finalRound && nextPlayerIds.length >= 4);

        await client.query(
          "UPDATE ludo_tournament_matches SET player_ids=$1,status=$2 WHERE id=$3",
          [JSON.stringify(nextPlayerIds), nextReady ? "ready" : "waiting", nextMatch.id]
        );

        await client.query(
          "UPDATE ludo_tournament_entries SET status='active' WHERE tournament_id=$1 AND user_id=$2",
          [tournamentId, winnerId]
        );

        await client.query("COMMIT");

        return NextResponse.json({
          ok: true,
          nextMatch: {
            id: nextMatch.id,
            roomCode: nextMatch.room_code,
            round: roundNo + 1,
            matchNo: nextMatchNo,
            status: nextReady ? "ready" : "waiting",
            size: roundNo + 1 === finalRound ? 2 : 4,
          },
        });
      }

      await client.query(
        "UPDATE ludo_tournament_entries SET status='winner' WHERE tournament_id=$1 AND user_id=$2",
        [tournamentId, winnerId]
      );

      const secondPlace = playerIds.find((id: string) => id !== winnerId);
      let thirdPlace: string | undefined;

      if (finalRound === 1) {
        thirdPlace = playerIds.find((id: string) => id !== winnerId && id !== secondPlace);
      } else {
        const semifinalResult = await client.query(
          `SELECT player_ids,winner_id
           FROM ludo_tournament_matches
           WHERE tournament_id=$1 AND round_no=$2 AND status='finished'
           ORDER BY match_no`,
          [tournamentId, finalRound - 1]
        );
        const semifinalLosers: string[] = [];
        for (const semifinal of semifinalResult.rows) {
          const ids = Array.isArray(semifinal.player_ids) ? semifinal.player_ids : [];
          for (const id of ids) {
            if (id !== semifinal.winner_id && !semifinalLosers.includes(id)) {
              semifinalLosers.push(id);
            }
          }
        }
        thirdPlace = semifinalLosers.find(
          (id) => id !== secondPlace && id !== winnerId
        );
      }

      const prizes = Array.isArray(match.prizes) ? match.prizes : [];
      const winners = [winnerId, secondPlace, thirdPlace].filter(Boolean) as string[];

      for (let placeIndex = 0; placeIndex < winners.length && placeIndex < prizes.length; placeIndex++) {
        const prize = prizes[placeIndex] || {};
        for (const currency of ["coins", "gems"] as const) {
          const amount = Number(prize[currency] || 0);
          if (!amount) continue;

          const wallet = await client.query(
            `SELECT coins,gems FROM ludo_users WHERE id=$1 FOR UPDATE`,
            [winners[placeIndex]]
          );
          const before = Number(wallet.rows[0][currency]);
          const after = before + amount;

          await client.query(
            `UPDATE ludo_users SET ${currency}=$1 WHERE id=$2`,
            [after, winners[placeIndex]]
          );

          await client.query(
            `INSERT INTO ludo_tournament_prizes
             (tournament_id,user_id,place,currency,amount)
             VALUES($1,$2,$3,$4,$5)
             ON CONFLICT(tournament_id,user_id,place) DO NOTHING`,
            [tournamentId, winners[placeIndex], placeIndex + 1, currency, amount]
          );

          await client.query(
            `INSERT INTO ludo_admin_ledger
             (user_id,currency,amount,balance_before,balance_after,reason,source)
             VALUES($1,$2,$3,$4,$5,$6,'tournament')`,
            [
              winners[placeIndex],
              currency,
              amount,
              before,
              after,
              `Tournament prize: ${match.name} — place ${placeIndex + 1}`,
            ]
          );
        }
      }

      await client.query(
        "UPDATE ludo_tournaments SET status='finished',updated_at=NOW() WHERE id=$1",
        [tournamentId]
      );

      await client.query("COMMIT");

      return NextResponse.json({
        ok: true,
        finished: true,
        winnerId,
        places: winners,
      });
    }

    return NextResponse.json({ error: "Unknown tournament action." }, { status: 400 });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(error);
    return NextResponse.json({ error: "Tournament action failed." }, { status: 500 });
  } finally {
    client.release();
  }
}
