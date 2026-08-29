"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "./shop.css";

type Item = Record<string, any>;
type ImageMode = "upload" | "url";
type AddKind = "avatar" | "yard-background" | "yard-backgroundless" | "sticker";

const CATEGORIES = [["all", "All Shop", "🛍️"], ["coin_package", "Coin Packs", "🪙"], ["gem_package", "Gem Packs", "💎"], ["board", "Boards", "🎯"], ["dice", "Dice", "🎲"], ["avatar", "Avatars", "🧑‍🎮"], ["yard", "Yards", "🏠"], ["sticker", "Stickers", "✨"]] as const;
const AVATAR_CATEGORIES = [["classic", "Classic"], ["heroes", "Heroes"], ["royal", "Royal"], ["fantasy", "Fantasy"], ["sports", "Sports"], ["animals", "Animals"], ["funny", "Funny"], ["seasonal", "Seasonal"], ["limited", "Limited Edition"]] as const;
const money = (value: any) => Number(value || 0).toLocaleString();
const isPackage = (item: Item) => item.type === "coin_package" || item.type === "gem_package";
const paymentLabel = (item: Item) => item.currency === "naira" ? `₦${money(item.price)}` : item.currency === "gems" ? `💎 ${money(item.price)}` : `🪙 ${money(item.price)}`;
const rewardLabel = (item: Item) => item.rewardCurrency === "gems" ? `💎 ${money(item.reward)}` : `🪙 ${money(item.reward)}`;
const priceLabel = (item: Item) => isPackage(item) ? `${rewardLabel(item)} for ${paymentLabel(item)}` : paymentLabel(item);
const categoryOf = (item: Item) => item.type === "item" ? (item.yardKind === "sticker" || String(item.id || "").includes("sticker") ? "sticker" : "yard") : item.type;
const isBackgroundless = (item: Item) => String(item.yardKind || item.kind || "").toLowerCase() === "backgroundless" || item.backgroundless === true || item.hasBackground === false;

function Visual({ item }: { item: Item }) {
  const [broken, setBroken] = useState(false);
  if (isPackage(item)) return <div className="shop-visual" aria-label="Currency package"><span>{item.type === "gem_package" ? "💎" : "🪙"}</span></div>;
  return <div className="shop-visual">{item.imageUrl && !broken ? <img src={item.imageUrl} alt={item.name || "Shop item"} onError={() => setBroken(true)} /> : <span>{item.icon || (item.type === "avatar" ? "🧑‍🎮" : categoryOf(item) === "sticker" ? "✨" : "🏠")}</span>}</div>;
}

export default function AdminShopPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [visualItems, setVisualItems] = useState<Item[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [imageMode, setImageMode] = useState<ImageMode>("upload");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/shop", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load shop");
      setItems(data.items || []);
      setVisualItems(data.visualItems || []);
    } catch (error: any) {
      setMessage(error?.message || "Unable to load shop");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const all = useMemo<Item[]>(() => [...items, ...visualItems.map((item) => ({ ...item, type: "item", isVisual: true, isActive: item.is_published !== false }))], [items, visualItems]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return all.filter((item) => {
      const matchesCategory = category === "all" || categoryOf(item) === category;
      const haystack = `${item.name || ""} ${item.id || ""} ${item.description || ""}`.toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
  }, [all, category, search]);

  const openNew = (kind: AddKind) => {
    setFileName(""); setImageMode("upload");
    if (kind === "avatar") {
      setEditing({ isNewAvatar: true, name: "New Avatar", description: "", categoryId: "classic", rarity: "COMMON", currency: "gems", price: 500, requiredLevel: 0, imageUrl: "", imageData: "", isActive: true }); return;
    }
    const backgroundless = kind === "yard-backgroundless";
    if (kind === "yard-background" || backgroundless) {
      setEditing({ isVisual: true, name: backgroundless ? "New Backgroundless Yard" : "New Background Yard", description: "", kind: "background", yardKind: backgroundless ? "backgroundless" : "background", backgroundless, hasBackground: !backgroundless, rarity: "COMMON", currency: "gems", price: 50, stockQuantity: -1, requiredLevel: 0, icon: "🏠", imageUrl: "" }); return;
    }
    setEditing({ isVisual: true, name: "New Sticker", description: "", kind: "sticker", yardKind: "sticker", rarity: "COMMON", currency: "gems", price: 50, stockQuantity: -1, requiredLevel: 0, icon: "✨", imageUrl: "" });
  };

  const openEdit = (item: Item) => {
    setFileName(""); setImageMode(item.imageData ? "upload" : "url");
    setEditing({ ...item, isVisual: Boolean(item.isVisual), isNewAvatar: item.type === "avatar", imageData: item.imageData || "" });
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) { setMessage("Use PNG, JPG, JPEG, WebP or GIF."); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage("Image is too large. Maximum 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setFileName(file.name); setEditing((current) => current ? { ...current, imageData: String(reader.result), imageUrl: "" } : current); setMessage(""); };
    reader.readAsDataURL(file);
  };

  const avatarAction = async (id: string, action: "hide_avatar" | "show_avatar" | "delete_avatar") => {
    if (!id) return;
    if (action === "delete_avatar" && !window.confirm("Delete this avatar permanently?")) return;
    setMessage("");
    try {
      const response = await fetch("/api/admin/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Avatar action failed");
      setMessage(action === "delete_avatar" ? "Avatar deleted." : action === "hide_avatar" ? "Avatar hidden from players." : "Avatar is visible again."); await load();
    } catch (error: any) { setMessage(error?.message || "Avatar action failed"); }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true); setMessage("");
    try {
      if (isPackage(editing)) {
        const reward = Math.trunc(Number(editing.reward));
        const price = Math.trunc(Number(editing.price));
        const rewardCurrency = editing.type === "gem_package" ? "gems" : "coins";
        const paymentCurrency = editing.type === "gem_package" ? "naira" : "gems";
        if (!editing.id || !Number.isFinite(reward) || reward <= 0 || !Number.isFinite(price) || price < 0) throw new Error("Enter a valid amount and exchange price.");
        const response = await fetch("/api/admin/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", type: editing.type, id: editing.id, reward, rewardCurrency, currency: paymentCurrency, price }) });
        const data = await response.json(); if (!response.ok) throw new Error(data?.error || "Save failed");
        setEditing(null); setMessage("Currency exchange updated successfully."); await load(); return;
      }
      if (editing.isNewAvatar && imageMode === "upload" && !editing.imageData) throw new Error("Choose an image to upload.");
      if (editing.isNewAvatar && imageMode === "url" && !String(editing.imageUrl || "").trim()) throw new Error("Enter an Image URL.");
      let action = "save";
      if (editing.isNewAvatar) action = editing.id ? "edit_avatar" : "create_avatar";
      else if (editing.isVisual) action = editing.id ? "edit_visual" : "create_visual";
      const body = editing.isNewAvatar ? { ...editing, action, categoryId: editing.categoryId || "classic", imageUrl: imageMode === "url" ? String(editing.imageUrl || "").trim() : "", imageData: imageMode === "upload" ? editing.imageData : "" } : editing.isVisual ? { ...editing, action } : { ...editing, action: "save", isActive: editing.isActive !== false };
      const response = await fetch("/api/admin/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data?.error || "Save failed");
      setEditing(null); setMessage("Shop updated successfully."); await load();
    } catch (error: any) { setMessage(error?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  return <div className="shop-admin">
    <div className="shop-topbar"><div className="shop-title"><Link href="/dbase" className="back">← Dashboard</Link><div className="eyebrow">LIVE SHOP CONTROL</div><h1>Shop Management</h1><p>Manage currency exchanges separately from cosmetic items.</p></div><div className="add-actions"><button className="add-button" onClick={() => setCategory("coin_package")}>＋ Coin Exchange</button><button className="add-button" onClick={() => setCategory("gem_package")}>＋ Gem Exchange</button><button className="add-button" onClick={() => openNew("avatar")}>＋ Avatar</button><button className="add-button" onClick={() => openNew("yard-background")}>＋ Background Yard</button><button className="add-button" onClick={() => openNew("yard-backgroundless")}>＋ Backgroundless Yard</button><button className="add-button" onClick={() => openNew("sticker")}>＋ Sticker</button></div></div>
    <div className="shop-toolbar"><div className="category-tabs">{CATEGORIES.map(([key, title, icon]) => <button key={key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}><span>{icon}</span>{title}</button>)}</div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search shop items..." /></div>
    {message && <div className="shop-message">{message}</div>}
    {loading ? <div className="shop-loading">Loading live shop catalogue…</div> : <div className="shop-grid">{filtered.map((item, index) => {
      const isAvatar = item.type === "avatar"; const hidden = item.isActive === false;
      return <article className="shop-card" key={`${item.type}-${item.id}-${index}`}><div className="card-image"><Visual item={item} /><span className={`rarity ${String(item.rarity || "COMMON").toLowerCase()}`}>{isPackage(item) ? "EXCHANGE" : item.rarity || "COMMON"}</span>{hidden && <span className="hidden-badge">HIDDEN</span>}</div><div className="card-body"><div className="card-name"><h3>{item.name || item.id}</h3><span>{isPackage(item) ? (item.type === "coin_package" ? "Coin Exchange" : "Gem Exchange") : isAvatar ? "Avatar" : item.isVisual ? (categoryOf(item) === "yard" ? (isBackgroundless(item) ? "Backgroundless Yard" : "Background Yard") : "Sticker") : item.description || item.category || item.type}</span></div><div className="card-price"><b>{priceLabel(item)}</b></div><div className="card-actions"><button onClick={() => openEdit(item)}>Edit</button>{isAvatar ? <><button onClick={() => avatarAction(String(item.id), hidden ? "show_avatar" : "hide_avatar")}>{hidden ? "Show" : "Hide"}</button>{!item.isBuiltin && <button className="danger" onClick={() => avatarAction(String(item.id), "delete_avatar")}>Delete</button>}</> : item.isVisual ? <button className="danger" onClick={async () => { if (!window.confirm("Delete this item?")) return; await fetch("/api/admin/shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_visual", id: item.id }) }); await load(); }}>Delete</button> : null}</div></div></article>;
    })}</div>}
    {editing && <div className="editor-backdrop" onMouseDown={(event) => event.currentTarget === event.target && setEditing(null)}><div className="shop-editor"><div className="editor-title"><div><span>{isPackage(editing) ? (editing.type === "coin_package" ? "COIN EXCHANGE" : "GEM EXCHANGE") : editing.isNewAvatar ? "AVATAR SHOP ITEM" : editing.yardKind === "backgroundless" ? "BACKGROUNDLESS YARD" : editing.yardKind === "background" ? "BACKGROUND YARD" : editing.kind === "sticker" ? "STICKER SHOP ITEM" : "SHOP ITEM"}</span><h2>{isPackage(editing) ? "Edit exchange" : editing.id ? "Edit item" : "Add item"}</h2></div><button onClick={() => setEditing(null)}>✕</button></div>
      {isPackage(editing) ? <><div className="editor-preview"><Visual item={editing} /><div><b>{editing.name || "Currency exchange"}</b><small>{editing.type === "coin_package" ? "Players exchange Gems → Coins" : "Players pay Naira → receive Gems"}</small></div></div><div className="form-grid"><label className="wide">Package name<input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label><label>{editing.type === "coin_package" ? "Coins received 🪙" : "Gems received 💎"}<input type="number" min="1" value={editing.reward ?? 0} onChange={(e) => setEditing({ ...editing, reward: Number(e.target.value), name: editing.type === "coin_package" ? `${Number(e.target.value).toLocaleString()} Coins` : `${Number(e.target.value).toLocaleString()} Gems` })} /></label><label>{editing.type === "coin_package" ? "Gems required 💎" : "Price in Naira ₦"}<input type="number" min="0" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></label><div className="wide shop-message">{editing.type === "coin_package" ? "Exchange: Gems → Coins. No image, rarity, unlock level or cosmetic fields are used." : "Exchange: Naira → Gems. No image, rarity, unlock level or cosmetic fields are used."}</div></div></> : <><div className="editor-preview"><Visual item={editing} /><div><b>{editing.name || "New item"}</b></div></div><div className="form-grid"><label>Name<input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label><label className="wide">Description<textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></label>{editing.isNewAvatar && <div className="wide image-method"><strong>Avatar image</strong><div className="image-mode-tabs"><button type="button" className={imageMode === "upload" ? "active" : ""} onClick={() => { setImageMode("upload"); setEditing({ ...editing, imageUrl: "" }); }}>🖼️ Upload Image</button><button type="button" className={imageMode === "url" ? "active" : ""} onClick={() => { setImageMode("url"); setEditing({ ...editing, imageData: "" }); }}>🔗 Image URL</button></div>{imageMode === "upload" ? <><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => handleFile(e.target.files?.[0])} /><button type="button" className="add-button" onClick={() => fileRef.current?.click()}>{fileName ? "Change Image" : "Choose Image"}</button>{fileName && <small>{fileName} · max 5 MB</small>}</> : <input value={editing.imageUrl || ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value, imageData: "" })} placeholder="https://example.com/avatar.png" />}</div>}{!editing.isNewAvatar && <label className="wide">Image URL<input value={editing.imageUrl || ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} placeholder="https://..." /></label>}{editing.isNewAvatar && <label>Avatar Category<select value={editing.categoryId || "classic"} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>{AVATAR_CATEGORIES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>}{editing.isVisual && <label>Yard Type<select value={editing.yardKind === "backgroundless" ? "backgroundless" : editing.kind === "sticker" ? "sticker" : "background"} onChange={(e) => { const value = e.target.value; setEditing({ ...editing, kind: value === "sticker" ? "sticker" : "background", yardKind: value, backgroundless: value === "backgroundless", hasBackground: value === "background" }); }}><option value="background">Background Yard</option><option value="backgroundless">Backgroundless Yard</option><option value="sticker">Sticker</option></select></label>}<label>Currency<select value={editing.currency || "coins"} onChange={(e) => setEditing({ ...editing, currency: e.target.value })}><option value="coins">Coins</option><option value="gems">Gems</option><option value="naira">Naira</option></select></label><label>Price<input type="number" min="0" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></label><label>Unlock level<input type="number" min="0" value={editing.requiredLevel ?? 0} onChange={(e) => setEditing({ ...editing, requiredLevel: Number(e.target.value) })} /></label><label>Rarity<select value={editing.rarity || "COMMON"} onChange={(e) => setEditing({ ...editing, rarity: e.target.value })}><option>COMMON</option><option>RARE</option><option>EPIC</option><option>LEGENDARY</option></select></label></div></>}
      <button className="save-button" disabled={saving} onClick={save}>{saving ? "Saving…" : isPackage(editing) ? "Save exchange" : "Save shop changes"}</button></div></div>}
  </div>;
}
