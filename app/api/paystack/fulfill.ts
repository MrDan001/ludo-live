import { PoolClient } from "pg";
import { getShopItem } from "../shop/catalog";
import { ensureWalletAudit, markWalletContext } from "../lib/wallet-audit";

const XP_PER_DIAMOND_PURCHASE = 15;
const levelRequired = (level: number) => 10 + Math.max(0, level) * 5;

type PaymentRow = {
  reference: string;
  user_id: string;
  package_id: string;
  gems: number;
  amount_kobo: number;
  status: string;
};

export async function fulfillPaystackPayment(client: PoolClient, reference: string) {
  await client.query("BEGIN");
  try {
    await ensureWalletAudit(client);
    const locked = await client.query<PaymentRow>(
      "SELECT reference,user_id,package_id,gems,amount_kobo,status FROM ludo_shop_payments WHERE reference=$1 FOR UPDATE",
      [reference],
    );
    const row = locked.rows[0];
    if (!row) throw new Error("Payment record not found.");

    if (row.status === "credited") {
      await client.query("COMMIT");
      return { credited: false, alreadyCredited: true, reference, packageId: row.package_id };
    }

    if (row.status !== "pending") throw new Error(`Payment cannot be credited from status '${row.status}'.`);

    if (String(row.package_id).startsWith("item:")) {
      const [, type, id] = String(row.package_id).split(":");
      const allowedTypes = new Set(["board", "dice", "avatar", "item"]);
      if (!allowedTypes.has(type) || !id) throw new Error("Invalid Paystack shop item reference.");
      const item = await getShopItem(type, id);
      const itemName = item?.name || `${type} ${id}`;
      const user = await client.query<any>(
        "SELECT owned_boards,owned_dice,owned_avatars,owned_items FROM ludo_users WHERE id=$1 FOR UPDATE",
        [row.user_id],
      );
      if (!user.rows[0]) throw new Error("Account not found.");
      const field = type === "board" ? "owned_boards" : type === "dice" ? "owned_dice" : type === "avatar" ? "owned_avatars" : "owned_items";
      const rawOwned = user.rows[0][field];
      let owned: string[];
      try {
        owned = Array.isArray(rawOwned) ? rawOwned.map(String) : JSON.parse(rawOwned || "[]");
      } catch {
        throw new Error(`Invalid ownership data for ${field}.`);
      }
      if (!owned.includes(id)) {
        await client.query(`UPDATE ludo_users SET ${field}=$1::jsonb WHERE id=$2`, [JSON.stringify([...owned, id]), row.user_id]);
      }
      await markWalletContext(client, { source: "shop_purchase", sourceRef: reference, reason: `Purchased ${itemName}` });
    } else if (String(row.package_id).startsWith("package:")) {
      const [, type, id] = String(row.package_id).split(":");
      const rewardCurrency = type === "gem_package" ? "gems" : type === "coin_package" ? "coins" : "";
      const reward = Math.max(0, Number(row.gems) || 0);
      if (!id || !reward || !rewardCurrency) throw new Error("Invalid Paystack package snapshot.");
      const pack = await getShopItem(type, id);
      const packName = pack?.name || `${type} ${id}`;
      const user = await client.query<any>("SELECT coins,gems,xp,level FROM ludo_users WHERE id=$1 FOR UPDATE", [row.user_id]);
      if (!user.rows[0]) throw new Error("Account not found.");
      const beforeCoins = Number(user.rows[0].coins) || 0;
      const beforeGems = Number(user.rows[0].gems) || 0;
      let xp = Math.max(0, Number(user.rows[0].xp) || 0);
      let level = Math.max(0, Number(user.rows[0].level) || 0);
      if (rewardCurrency === "gems") {
        xp += XP_PER_DIAMOND_PURCHASE;
        while (xp >= levelRequired(level)) { xp -= levelRequired(level); level += 1; }
      }
      const afterCoins = rewardCurrency === "coins" ? beforeCoins + reward : beforeCoins;
      const afterGems = rewardCurrency === "gems" ? beforeGems + reward : beforeGems;
      await markWalletContext(client, { source: "shop_purchase", sourceRef: reference, reason: `Purchased ${packName}` });
      await client.query("UPDATE ludo_users SET coins=$1,gems=$2,xp=$3,level=$4 WHERE id=$5", [afterCoins, afterGems, xp, level, row.user_id]);
      await client.query(
        "INSERT INTO ludo_admin_ledger(user_id,currency,amount,balance_before,balance_after,reason,source) VALUES($1,$2,$3,$4,$5,$6,'paystack')",
        [row.user_id, rewardCurrency, reward, rewardCurrency === "coins" ? beforeCoins : beforeGems, rewardCurrency === "coins" ? afterCoins : afterGems, `Purchased ${packName}`],
      );
    } else {
      throw new Error("Unknown Paystack purchase type.");
    }

    await client.query("UPDATE ludo_shop_payments SET status='credited',credited_at=NOW() WHERE reference=$1", [reference]);
    await client.query("COMMIT");
    return { credited: true, alreadyCredited: false, reference, packageId: row.package_id };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
