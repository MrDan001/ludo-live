"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppFrame from "../../_components/AppFrame";

type Purchase = {
  success: boolean;
  status: string;
  reference: string;
  amountNaira: number;
  itemName: string;
  purchaseType: string;
  reward: number;
  rewardCurrency: string;
  wallet: { coins: number; gems: number };
};

function formatReward(p: Purchase) {
  if (p.rewardCurrency === "gems") return `+${p.reward.toLocaleString()} Gems`;
  if (p.rewardCurrency === "coins") return `+${p.reward.toLocaleString()} Coins`;
  return "Added to your inventory";
}

export default function PaymentSuccessPage() {
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const reference = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reference") || "" : "";

  useEffect(() => {
    if (!reference) {
      setError("We couldn't find the payment reference.");
      setChecking(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/paystack/purchase-status?reference=${encodeURIComponent(reference)}`, { cache: "no-store" });
        const data = await response.json();
        if (cancelled) return;
        if (response.ok && data.success) {
          setPurchase(data);
          setChecking(false);
          window.dispatchEvent(new Event("ludo-wallet-updated"));
          return;
        }
        if (data.status === "pending" && attempts < 12) {
          window.setTimeout(check, 1500);
          return;
        }
        setError(data.error || "Your payment was received, but we're still confirming the purchase.");
        setChecking(false);
      } catch {
        if (!cancelled && attempts < 12) window.setTimeout(check, 1500);
        else if (!cancelled) { setError("We couldn't confirm the purchase right now."); setChecking(false); }
      }
    };
    check();
    return () => { cancelled = true; };
  }, [reference]);

  return <AppFrame back="/shop"><style>{styles}</style><main className="success-page">
    <div className="aurora aurora-one" /><div className="aurora aurora-two" />
    <section className="success-card">
      <div className="sparkles" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
      <div className="success-orb">{checking ? <span className="spinner">⌛</span> : purchase ? <span>✓</span> : <span>!</span>}</div>
      <div className="eyebrow">LUDO LIVE • PAYMENT</div>
      <h1>{checking ? "Confirming your purchase" : purchase ? "Purchase Successful!" : "Payment received"}</h1>
      {checking ? <p className="lead">We're confirming your payment and adding your purchase to your account.</p> : purchase ? <>
        <p className="lead">Your purchase has been added to your wallet and inventory.</p>
        <div className="reward-panel">
          <div className="reward-icon">{purchase.rewardCurrency === "gems" ? "💎" : purchase.rewardCurrency === "coins" ? "🪙" : "🎁"}</div>
          <div className="reward-copy"><span>YOU RECEIVED</span><strong>{formatReward(purchase)}</strong><small>{purchase.itemName}</small></div>
        </div>
        <div className="details"><div><span>AMOUNT PAID</span><strong>₦{purchase.amountNaira.toLocaleString("en-NG")}</strong></div><div><span>STATUS</span><strong className="confirmed">✓ CONFIRMED</strong></div></div>
        <div className="wallet-box"><div><span>🪙 Coins</span><strong>{purchase.wallet.coins.toLocaleString()}</strong></div><div><span>💎 Gems</span><strong>{purchase.wallet.gems.toLocaleString()}</strong></div></div>
      </> : <p className="lead">{error}</p>}
      {!checking && purchase && <div className="actions"><Link href="/shop" className="primary">CONTINUE SHOPPING</Link><Link href="/home" className="secondary">BACK TO LOBBY</Link></div>}
      {!checking && !purchase && <div className="actions"><Link href="/shop" className="primary">RETURN TO SHOP</Link></div>}
      {purchase && <div className="reference">Transaction: {purchase.reference}</div>}
    </section>
  </main></AppFrame>;
}

const styles = `
.success-page{min-height:calc(100vh - 0px);display:grid;place-items:center;padding:32px 18px;position:relative;overflow:hidden;background:radial-gradient(circle at 50% 15%,rgba(56,189,248,.18),transparent 32%),linear-gradient(145deg,#07111f,#0b1326 52%,#080c17);color:#fff}
.aurora{position:absolute;width:420px;height:420px;border-radius:50%;filter:blur(80px);opacity:.18;pointer-events:none}.aurora-one{background:#16d9a5;top:-190px;left:-120px}.aurora-two{background:#7c3aed;right:-170px;bottom:-180px}
.success-card{width:min(620px,100%);position:relative;text-align:center;padding:42px 28px 30px;border:1px solid rgba(255,255,255,.12);border-radius:30px;background:linear-gradient(180deg,rgba(18,29,50,.94),rgba(8,15,29,.97));box-shadow:0 30px 90px rgba(0,0,0,.5),inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(16px)}
.success-orb{width:94px;height:94px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;font-size:48px;font-weight:900;background:radial-gradient(circle at 35% 25%,#b8ffe9,#26d39c 48%,#08795b);box-shadow:0 0 0 9px rgba(38,211,156,.1),0 0 50px rgba(38,211,156,.38);animation:pop .65s ease both}.success-orb .spinner{font-size:34px;animation:spin 1.2s linear infinite}.eyebrow{font-size:11px;letter-spacing:3px;color:#65e6c0;font-weight:800;margin-bottom:8px}h1{font-size:clamp(30px,7vw,46px);line-height:1.05;margin:0 0 12px;font-weight:900;letter-spacing:-1.5px}.lead{color:#aebbd0;font-size:15px;line-height:1.6;max-width:460px;margin:0 auto 24px}.sparkles span{position:absolute;color:#78f5d0;font-size:20px;animation:float 2.5s ease-in-out infinite}.sparkles span:nth-child(1){left:14%;top:19%}.sparkles span:nth-child(2){right:16%;top:24%;animation-delay:.4s}.sparkles span:nth-child(3){left:22%;top:42%;animation-delay:.8s}.sparkles span:nth-child(4){right:22%;top:44%;animation-delay:1.2s}
.reward-panel{display:flex;align-items:center;text-align:left;gap:18px;padding:18px;border-radius:20px;background:linear-gradient(135deg,rgba(23,211,158,.14),rgba(44,120,255,.08));border:1px solid rgba(93,239,199,.2);margin:18px 0}.reward-icon{width:68px;height:68px;display:grid;place-items:center;border-radius:18px;background:rgba(255,255,255,.08);font-size:36px}.reward-copy{display:flex;flex-direction:column;gap:3px}.reward-copy span,.details span{font-size:10px;letter-spacing:1.5px;color:#7f91aa;font-weight:800}.reward-copy strong{font-size:25px;color:#fff}.reward-copy small{color:#9aabc0;font-size:13px}.details{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}.details>div,.wallet-box{padding:14px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.details div{display:flex;flex-direction:column;gap:5px}.details strong{font-size:16px}.confirmed{color:#65e6c0}.wallet-box{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px}.wallet-box div{display:flex;justify-content:space-between;align-items:center;color:#aebbd0;font-size:13px}.wallet-box strong{color:#fff;font-size:16px}.actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.actions a{display:flex;justify-content:center;align-items:center;min-height:48px;border-radius:14px;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:.8px}.primary{background:linear-gradient(135deg,#36e0ad,#15b989);color:#04130e;box-shadow:0 10px 30px rgba(28,205,153,.2)}.secondary{border:1px solid rgba(255,255,255,.12);color:#d9e3f0;background:rgba(255,255,255,.04)}.reference{margin-top:17px;font-size:10px;color:#64748b;word-break:break-all}@keyframes pop{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}@keyframes float{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(-9px);opacity:1}}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:520px){.success-card{padding:34px 18px 24px;border-radius:24px}.details,.wallet-box,.actions{grid-template-columns:1fr}.reward-copy strong{font-size:21px}}
`;
