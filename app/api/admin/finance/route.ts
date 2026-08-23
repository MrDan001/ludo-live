import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { ensureTournamentV2Schema } from "../../tournaments/_schema";

async function admin(q: NextRequest) {
  const token = q.cookies.get("ludo_session")?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const r = await pool.query<any>("SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1", [hash]);
  const u = r.rows[0];
  if (!u || u.is_guest || u.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return u.email && allowed.includes(u.email.toLowerCase()) ? u : null;
}

const walletColumns: Record<string, string> = {
  money_bank: "money_bank",
  treasury: "treasury",
  revenue: "revenue",
};

export async function GET(q: NextRequest) {
  try {
    await ensureAuthSchema();
    await ensureTournamentV2Schema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const r = await pool.query<any>("SELECT * FROM ludo_admin_wallets WHERE id='platform'");
    const ledger = await pool.query<any>("SELECT * FROM ludo_admin_wallet_ledger ORDER BY created_at DESC LIMIT 200");
    return NextResponse.json({ wallet: r.rows[0], ledger: ledger.rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Admin finance unavailable." }, { status: 500 });
  }
}

export async function POST(q: NextRequest) {
  const client = await pool.connect();
  try {
    await ensureAuthSchema();
    await ensureTournamentV2Schema();
    const a = await admin(q);
    if (!a) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    const b = await q.json();
    const action = String(b.action || "");
    const currency = b.currency === "gems" ? "gems" : "coins";
    const amount = Math.trunc(Number(b.amount));
    const reason = String(b.reason || "Admin finance action").trim();
    if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });

    await client.query("BEGIN");
    const wallet = await client.query<any>("SELECT * FROM ludo_admin_wallets WHERE id='platform' FOR UPDATE");
    if (!wallet.rowCount) throw new Error("Admin wallet not initialized");

    if (action === "topup_money_bank") {
      const column = currency === "gems" ? "money_bank_gems" : "money_bank_coins";
      const before = BigInt(wallet.rows[0][column]);
      const after = before + BigInt(amount);
      await client.query(`UPDATE ludo_admin_wallets SET ${column}=$1,updated_at=NOW() WHERE id='platform'`, [after.toString()]);
      await client.query("INSERT INTO ludo_admin_wallet_ledger(admin_user_id,wallet_to,currency,amount,reason) VALUES($1,'money_bank',$2,$3,$4)", [a.id, currency, amount, reason]);
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, action, currency, amount, balance: after.toString() });
    }

    if (action === "transfer") {
      const from = String(b.from || "");
      const to = String(b.to || "");
      if (!walletColumns[from] || !walletColumns[to] || from === to) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Invalid wallet transfer." }, { status: 400 });
      }
      const suffix = currency === "gems" ? "gems" : "coins";
      const fromColumn = `${walletColumns[from]}_${suffix}`;
      const toColumn = `${walletColumns[to]}_${suffix}`;
      const fromBefore = BigInt(wallet.rows[0][fromColumn]);
      if (fromBefore < BigInt(amount)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Insufficient wallet balance." }, { status: 400 });
      }
      await client.query(`UPDATE ludo_admin_wallets SET ${fromColumn}=${fromColumn}-$1,${toColumn}=${toColumn}+$1,updated_at=NOW() WHERE id='platform'`, [amount]);
      await client.query("INSERT INTO ludo_admin_wallet_ledger(admin_user_id,wallet_from,wallet_to,currency,amount,reason) VALUES($1,$2,$3,$4,$5,$6)", [a.id, from, to, currency, amount, reason]);
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, action, from, to, currency, amount });
    }

    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Unknown finance action." }, { status: 400 });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(e);
    return NextResponse.json({ error: "Admin finance action failed." }, { status: 500 });
  } finally {
    client.release();
  }
}
