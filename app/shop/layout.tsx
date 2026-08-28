import type { ReactNode } from "react";
import YardShopTab from "./YardShopTab";
import ShopLevelLockOverlay from "./ShopLevelLockOverlay";
export default function ShopLayout({ children }: { children: ReactNode }) {
  return <>{children}<YardShopTab/><ShopLevelLockOverlay/></>;
}
