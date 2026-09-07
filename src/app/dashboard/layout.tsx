import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={tenant.slug} />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar orgSlug={tenant.slug} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
