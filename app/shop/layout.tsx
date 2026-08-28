import type { ReactNode } from "react";
import YardShopTab from "./YardShopTab";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <>{children}<YardShopTab /></>;
}
