import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "../../../lib/auth-session";
import rules = require("../../../lib/ludoRules");

async function qaAdmin(request: NextRequest) {
  const user = await currentUser(request);
  if (!user || user.is_guest || user.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  return user.email && allowed.includes(String(user.email).toLowerCase()) ? user : null;
}

function run(name: string, fn: () => boolean) {
  try { return { name, passed: !!fn() }; } catch (error) { return { name, passed: false, error: error instanceof Error ? error.message : "test error" }; }
}

function makeToken(color: string, id: number, position: number) { return { color, id, position, state: rules.tokenState(position) }; }

function tests() {
  const out = [
    run("Constants / board geometry", () => rules.TRACK_LENGTH === 51 && rules.HOME_START === 52 && rules.FINISH === 57),
    run("Yard requires six", () => rules.canMove([makeToken("red", 0, 0)], makeToken("red", 0, 0), 6) && !rules.canMove([makeToken("red", 0, 0)], makeToken("red", 0, 0), 5)),
    run("Exact finish / overshoot rejected", () => rules.nextProgress(56, 1) === 57 && rules.nextProgress(56, 2) === null),
    run("Finished token cannot move", () => !rules.canMove([makeToken("red", 0, 57)], makeToken("red", 0, 57), 1)),
    run("Two-opponent blockade blocks movement", () => {
      const base = makeToken("red", 0, 10), target = rules.getTrackCell("red", 11);
      if (!target) return false;
      const match = Array.from({ length: 51 }, (_, i) => i + 1).find(p => JSON.stringify(rules.getTrackCell("green", p)) === JSON.stringify(target));
      if (!match) return false;
      const tokens = [base, makeToken("green", 0, match), makeToken("green", 1, match)];
      return !rules.canMove(tokens, base, 1);
    }),
    run("Single capture returns opponent to yard", () => {
      const mover = makeToken("red", 0, 10), targetCell = rules.getTrackCell("red", 11);
      const match = Array.from({ length: 51 }, (_, i) => i + 1).find(p => JSON.stringify(rules.getTrackCell("green", p)) === JSON.stringify(targetCell));
      if (!match) return false;
      const result = rules.applyMove([mover, makeToken("green", 0, match)], mover, 1);
      return !!result && result.captured?.color === "green" && result.tokens.some((t: any) => t.color === "green" && t.position === 0);
    }),
    run("Kill reward sends killer to small finish box", () => {
      const mover = makeToken("red", 0, 10), targetCell = rules.getTrackCell("red", 11);
      const match = Array.from({ length: 51 }, (_, i) => i + 1).find(p => JSON.stringify(rules.getTrackCell("green", p)) === JSON.stringify(targetCell));
      if (!match) return false;
      const result = rules.applyMove([mover, makeToken("green", 0, match)], mover, 1);
      return !!result && result.tokens.some((t: any) => t.color === "red" && t.id === 0 && t.position === rules.FINISH && t.state === "finished");
    }),
    run("Safe cell cannot be captured", () => {
      const safe = rules.SAFE_CELLS[0];
      const redProgress = Array.from({ length: 51 }, (_, i) => i + 1).find(p => { const c = rules.getTrackCell("red", p); return c && c[0] === safe.row && c[1] === safe.col; });
      if (!redProgress || rules.nextProgress(redProgress - 1, 1) !== redProgress) return false;
      const targetCell = rules.getTrackCell("red", redProgress), greenProgress = Array.from({ length: 51 }, (_, i) => i + 1).find(p => JSON.stringify(rules.getTrackCell("green", p)) === JSON.stringify(targetCell));
      if (!greenProgress) return false;
      const result = rules.applyMove([makeToken("red", 0, redProgress - 1), makeToken("green", 0, greenProgress)], makeToken("red", 0, redProgress - 1), 1);
      return !!result && !result.captured;
    }),
    run("Two-player seat mapping", () => JSON.stringify(rules.playerColorsForSeats(2, 0)) === JSON.stringify(["red", "yellow"]) && JSON.stringify(rules.playerColorsForSeats(2, 1)) === JSON.stringify(["green", "blue"])),
    run("Four-player seat mapping", () => rules.playerColorsForSeats(4, 0)[0] === "red" && rules.playerColorsForSeats(4, 3)[0] === "blue"),
  ];
  return { passed: out.filter(x => x.passed).length, total: out.length, tests: out };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await qaAdmin(request);
    if (!admin) return NextResponse.json({ error: "QA access required." }, { status: 403 });
    return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), ...tests() });
  } catch (error) {
    console.error("QA error", error);
    return NextResponse.json({ error: "QA service unavailable." }, { status: 500 });
  }
}
