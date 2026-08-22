import type { ReactNode } from "react";
import ShopTabsLock from "./ShopTabsLock";
import ShopInventorySync from "./ShopInventorySync";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ShopTabsLock />
      <ShopInventorySync />
      {children}
    </>
  );
}
