import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { SettingsView } from "@/components/dashboard/settings-view";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const organization = await db.organization.findUnique({
    where: { id: tenant.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      logo: true,
      timezone: true,
    },
  });

  if (!organization) {
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
          <SettingsView organization={organization} />
        </main>
      </div>
    </div>
  );
}
