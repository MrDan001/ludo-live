import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { pool, ensureAuthSchema } from "../../auth/_db";
import { ensureWalletAudit } from "../../lib/wallet-audit";

const COOKIE = "ludo_session";

async function admin(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex");
  const result = await pool.query<any>(
    `SELECT u.* FROM ludo_users u JOIN ludo_sessions s ON s.user_id=u.id
     WHERE s.token_hash=$1 AND s.expires_at>NOW() LIMIT 1`, [hash]);
  const user = result.rows[0];
  if (!user || user.is_guest || user.is_banned) return null;
  const allowed = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  return user.email && allowed.includes(user.email.toLowerCase()) ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    await ensureAuthSchema();
    const actor = await admin(request);
    if (!actor) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    await ensureWalletAudit(pool);

    const [actions, wallet, sessions, banned, bannedEmails, stats] = await Promise.all([
      pool.query<any>(`SELECT a.id,a.action,a.target_user_id,u.username AS target_username,a.details,a.created_at,
        au.username AS admin_username,au.email AS admin_email FROM ludo_admin_actions a
        LEFT JOIN ludo_users u ON u.id=a.target_user_id LEFT JOIN ludo_users au ON au.id=a.admin_user_id
        ORDER BY a.created_at DESC LIMIT 250`),
      pool.query<any>(`SELECT w.*,u.username AS player_username,u.email AS player_email,
        au.username AS actor_username,au.email AS actor_email FROM ludo_wallet_audit w
        LEFT JOIN ludo_users u ON u.id=w.user_id LEFT JOIN ludo_users au ON au.id=w.actor_user_id
        ORDER BY w.created_at DESC LIMIT 250`),
      pool.query<any>(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE expires_at>NOW())::int AS active,
        COUNT(*) FILTER (WHERE expires_at<=NOW())::int AS expired,
        COUNT(*) FILTER (WHERE expires_at>NOW() AND u.is_banned)::int AS banned_active
        FROM ludo_sessions s JOIN ludo_users u ON u.id=s.user_id`),
      pool.query<any>(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM ludo_sessions s WHERE s.user_id=u.id AND s.expires_at>NOW()))::int AS with_active_sessions
        FROM ludo_users u WHERE u.is_banned=TRUE`),
      pool.query<any>(`SELECT COUNT(*)::int AS total FROM ludo_banned_emails`),
      pool.query<any>(`SELECT COUNT(*)::int AS users,COUNT(*) FILTER (WHERE is_guest)::int AS guests,
        COUNT(*) FILTER (WHERE is_banned)::int AS banned,COUNT(*) FILTER (WHERE NOT is_guest)::int AS registered FROM ludo_users`),
    ]);

    const session = sessions.rows[0] || {};
    const ban = banned.rows[0] || {};
    const suspicious = wallet.rows.filter((row: any) => ["review", "blocked"].includes(String(row.status)));
    const bridges = [
      { id:"session-cookie", name:"Session cookie + token hashing", category:"Authentication", status:"protected", detail:"ludo_session is HTTP-only in production and server-side sessions are stored as SHA-256 hashes." },
      { id:"session-expiry", name:"Session expiry validation", category:"Authentication", status:"healthy", detail:`${session.active || 0} active sessions; expired sessions are rejected by server-side expiry checks.` },
      { id:"admin-allowlist", name:"Admin identity allowlist", category:"Authorization", status:"protected", detail:"Admin APIs require a valid session, a non-guest/non-banned account, and an email in ADMIN_EMAILS/ADMIN_EMAIL." },
      { id:"ban-session-revocation", name:"Ban + session revocation", category:"Account security", status:Number(ban.with_active_sessions || 0)===0?"healthy":"alert", detail:`${ban.with_active_sessions || 0} banned accounts currently have active sessions.` },
      { id:"banned-email", name:"Banned-email registration bridge", category:"Account security", status:"protected", detail:`${bannedEmails.rows[0]?.total || 0} blocked email records are stored.` },
      { id:"wallet-trigger", name:"Wallet change audit trigger", category:"Economy security", status:"protected", detail:"Coins/gems changes are captured by ludo_wallet_audit for traceability." },
      { id:"wallet-review", name:"Unattributed wallet-change review", category:"Economy security", status:suspicious.length?"alert":"healthy", detail:`${suspicious.length} wallet events currently require review or are blocked.` },
      { id:"admin-actions", name:"Admin action audit trail", category:"Authorization", status:"protected", detail:`${actions.rows.length} recent admin actions are available to review.` },
      { id:"payment-signature", name:"Paystack webhook signature verification", category:"Payments", status:"protected", detail:"The payment webhook verifies x-paystack-signature with HMAC-SHA512 before processing." },
      { id:"visitor-guard", name:"Visitor deletion guard", category:"Administration", status:"protected", detail:"Visitor deletion is restricted to guest accounts and active sessions are revoked first." },
      { id:"tournament-funding", name:"Tournament funding guard", category:"Economy security", status:"protected", detail:"Tournament funding checks the admin funding balance inside a transaction with a row lock." },
    ];

    return NextResponse.json({
      ok:true, generatedAt:new Date().toISOString(), bridges,
      summary:{ users:Number(stats.rows[0]?.users||0),registered:Number(stats.rows[0]?.registered||0),guests:Number(stats.rows[0]?.guests||0),banned:Number(stats.rows[0]?.banned||0),activeSessions:Number(session.active||0),bannedWithActiveSessions:Number(ban.with_active_sessions||0),suspiciousWalletEvents:suspicious.length,adminActions:actions.rows.length,securityBridges:bridges.length },
      actions:actions.rows, wallet:wallet.rows, suspiciousWallet:suspicious,
      sessions:session, bans:ban,
    });
  } catch (error) {
    console.error("Security audit service", error);
    return NextResponse.json({ error:"Security audit service unavailable." }, { status:500 });
  }
}
