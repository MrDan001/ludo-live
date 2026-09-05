"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "../dbase.css";

type Slot = {
  slot: number;
  id: string;
  kind: "coins" | "gems" | "extraSpin" | "shop_item";
  label: string;
  icon: string;
  amount: number;
  probability: number;
  itemType?: string | null;
  itemId?: string | null;
};
type CatalogItem = Record<string, any>;

const EMPTY_SLOT = (slot: number): Slot => ({ slot, id: `slot-${slot + 1}`, kind: "coins", label: "Reward", icon: "🎁", amount: 100, probability: 1 });
const fmt = (value: any) => Number(value || 0).toLocaleString();

function Field({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (value: string) => void; type?: string }) {
  return <label className="admin-field"><span>{label}</span><input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></label>;
}

export default function SpinAdmin() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/spin", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load Spin Wheel.");
      const incoming = Array.isArray(data.rewards) ? data.rewards : [];
      setSlots(Array.from({ length: 8 }, (_, slot) => incoming.find((item: Slot) => Number(item.slot) === slot) || EMPTY_SLOT(slot)));
      setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Spin Wheel.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      if (editing.kind === "shop_item" && (!editing.itemType || !editing.itemId)) throw new Error("Select a Shop item for this slot.");
      const payload = {
        ...editing,
        amount: Number(editing.amount || 0),
        probability: Number(editing.probability || 0),
        itemType: editing.kind === "shop_item" ? editing.itemType : null,
        itemId: editing.kind === "shop_item" ? editing.itemId : null,
      };
      const response = await fetch("/api/admin/spin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save Spin Wheel slot.");
      setNotice(`Slot ${editing.slot + 1} updated. The live wheel now uses this reward.`);
      setEditing(null);
      await load();
      window.dispatchEvent(new Event("ludo-spin-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save Spin Wheel slot.");
    } finally {
      setSaving(false);
    }
  };

  const shopOptions = useMemo(() => catalog.map((item) => ({ value: `${item.type}::${item.id}`, label: `${item.name || item.title || item.id} · ${item.type}` })), [catalog]);
  const selectedShop = catalog.find((item) => item.type === editing?.itemType && item.id === editing?.itemId);

  const chooseShop = (value: string) => {
    const [type, id] = value.split("::");
    const item = catalog.find((entry) => entry.type === type && entry.id === id);
    setEditing((current) => current ? { ...current, itemType: type, itemId: id, label: item?.name || item?.title || current.label, icon: item?.icon || item?.emoji || current.icon, amount: 0 } : current);
  };

  return (
    <main className="dbase-app">
      <aside className="dbase-sidebar">
        <div className="brand"><div className="brand-mark">♛</div><div><b>LUDO LIVE</b><span>ADMIN CONTROL</span></div></div>
        <nav><div className="nav-wrap"><small>Management</small><Link href="/dbase">◈ Dashboard</Link><Link href="/dbase/shop">▣ Shop</Link><Link className="active" href="/dbase/spin">✦ Spin Wheel</Link><Link href="/dbase/missions">✓ Missions</Link><Link href="/dbase/events">◇ Events</Link><Link href="/dbase/tournament">♛ Tournament</Link><Link href="/dbase/finance">◉ Finance</Link></div></nav>
      </aside>

      <section className="dbase-main">
        <header className="dbase-header"><div className="header-title"><span>PLAYER REWARDS</span><h1>Spin Wheel</h1></div><div className="admin-user"><div className="user-avatar">A</div><div className="user-copy"><b>Administrator</b><span>8-slot live configuration</span></div></div></header>
        <div className="dbase-content">
          <div className="page-intro"><div><span className="eyebrow">SPIN WHEEL CONTROL</span><h2>Exactly 8 live reward slots</h2><p>Every slot on the player wheel is editable. Saving a slot updates the same server-side configuration used by the player wheel and the reward payout.</p></div><div className="live-pill"><span/> LIVE CONTROL</div></div>
          {notice && <div className="panel"><div className="empty good">✓ {notice}</div></div>}
          {error && <div className="panel"><div className="empty bad">{error}</div></div>}

          <div className="panel">
            <div className="panel-head"><div><span>FIXED CONFIGURATION</span><h3>Current Spin Wheel</h3></div><div className="status-badge live">8 / 8 ACTIVE</div></div>
            {loading ? <div className="empty">Loading Spin Wheel configuration…</div> : slots.map((slot) => (
              <div className="case-row" key={slot.slot}>
                <div className="mini-avatar">{slot.icon || "🎁"}</div>
                <div><b>Slot {slot.slot + 1} · {slot.label}</b><span>{slot.kind === "shop_item" ? `Shop item · ${slot.itemType}:${slot.itemId}` : `${slot.kind} · ${fmt(slot.amount)} · weight ${slot.probability}`}</span></div>
                <div className="row-meta"><b>{slot.kind === "shop_item" ? "Shop prize" : fmt(slot.amount)}</b><span className="good">LIVE</span></div>
                <button className="admin-btn" onClick={() => setEditing({ ...slot })}>Edit</button>
              </div>
            ))}
          </div>

          {editing && <div className="editor-card">
            <div className="editor-head"><b>Edit Spin Wheel Slot {editing.slot + 1}</b><button className="admin-btn" onClick={() => setEditing(null)}>✕</button></div>
            <div className="selected-preview"><div className="mini-avatar">{editing.icon}</div><div><b>Slot {editing.slot + 1}</b><span>There are always exactly 8 slots; this editor cannot add, delete, or disable slots.</span></div></div>
            <label className="admin-field"><span>Reward type</span><select value={editing.kind} onChange={(event) => setEditing({ ...editing, kind: event.target.value as Slot["kind"], itemType: null, itemId: null })}><option value="coins">🪙 Coins</option><option value="gems">💎 Gems</option><option value="extraSpin">🔄 Extra Spin</option><option value="shop_item">▣ Shop Item</option></select></label>
            {editing.kind === "shop_item" && <>
              <label className="admin-field"><span>Shop item</span><select value={editing.itemType && editing.itemId ? `${editing.itemType}::${editing.itemId}` : ""} onChange={(event) => chooseShop(event.target.value)}><option value="">Select a Shop item…</option>{shopOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              {selectedShop && <div className="selected-preview"><div className="mini-avatar">{selectedShop.icon || selectedShop.emoji || "▣"}</div><div><b>{selectedShop.name || selectedShop.title || selectedShop.id}</b><span>{selectedShop.type} · current Shop item</span></div><span className="status-badge live">Selected</span></div>}
            </>}
            <Field label="Display label" value={editing.label} onChange={(value) => setEditing({ ...editing, label: value })} />
            <Field label="Icon" value={editing.icon} onChange={(value) => setEditing({ ...editing, icon: value })} />
            <Field label="Amount" type="number" value={editing.amount} onChange={(value) => setEditing({ ...editing, amount: Number(value) })} />
            <Field label="Probability / weight" type="number" value={editing.probability} onChange={(value) => setEditing({ ...editing, probability: Number(value) })} />
            <button className="admin-btn primary-btn full" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Slot"}</button>
          </div>}
        </div>
      </section>
    </main>
  );
}
