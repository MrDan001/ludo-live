import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full">{children}</main>
      <SiteFooter />
    </div>
  );
}
