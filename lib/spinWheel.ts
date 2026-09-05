export const SPIN_SLOT_COUNT = 8 as const;

export type SpinKind = "coins" | "gems" | "extraSpin" | "shop_item";

export type SpinWheelSlot = {
  slot: number;
  id: string;
  kind: SpinKind;
  label: string;
  icon: string;
  amount: number;
  probability: number;
  itemType?: string | null;
  itemId?: string | null;
};

export const DEFAULT_SPIN_WHEEL: SpinWheelSlot[] = [
  { slot: 0, id: "slot-1", kind: "coins", label: "100 Coins", icon: "🪙", amount: 100, probability: 25 },
  { slot: 1, id: "slot-2", kind: "coins", label: "250 Coins", icon: "🪙", amount: 250, probability: 20 },
  { slot: 2, id: "slot-3", kind: "coins", label: "500 Coins", icon: "🪙", amount: 500, probability: 12 },
  { slot: 3, id: "slot-4", kind: "gems", label: "1 Gem", icon: "💎", amount: 1, probability: 12 },
  { slot: 4, id: "slot-5", kind: "gems", label: "3 Gems", icon: "💎", amount: 3, probability: 8 },
  { slot: 5, id: "slot-6", kind: "gems", label: "5 Gems", icon: "💎", amount: 5, probability: 5 },
  { slot: 6, id: "slot-7", kind: "extraSpin", label: "Extra Spin", icon: "🔄", amount: 1, probability: 8 },
  { slot: 7, id: "slot-8", kind: "coins", label: "1,000 Coins", icon: "🪙", amount: 1000, probability: 10 },
];

export function isSpinKind(value: unknown): value is SpinKind {
  return value === "coins" || value === "gems" || value === "extraSpin" || value === "shop_item";
}

export function cleanSpinSlot(input: Partial<SpinWheelSlot>, slot: number): SpinWheelSlot {
  const kind = isSpinKind(input.kind) ? input.kind : "coins";
  const amount = Math.max(0, Math.trunc(Number(input.amount) || 0));
  const probability = Math.max(0, Number(input.probability) || 0);
  const label = String(input.label ?? "Reward").trim().slice(0, 100) || "Reward";
  const icon = String(input.icon ?? "🎁").trim().slice(0, 16) || "🎁";
  const id = String(input.id ?? `slot-${slot + 1}`).trim() || `slot-${slot + 1}`;
  const itemType = kind === "shop_item" ? String(input.itemType ?? "").trim() || null : null;
  const itemId = kind === "shop_item" ? String(input.itemId ?? "").trim() || null : null;
  return { slot, id, kind, label, icon, amount, probability, itemType, itemId };
}

export function weightedPick<T extends { probability: number }>(items: readonly T[]): number {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.probability) || 0), 0);
  if (total <= 0) return -1;
  let cursor = Math.random() * total;
  for (let index = 0; index < items.length; index += 1) {
    cursor -= Math.max(0, Number(items[index].probability) || 0);
    if (cursor <= 0) return index;
  }
  return items.length - 1;
}
