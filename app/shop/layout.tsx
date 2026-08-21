import type { ReactNode } from "react";
import ShopTabsLock from "./ShopTabsLock";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ShopTabsLock />
      {children}
    </>
  );
}
