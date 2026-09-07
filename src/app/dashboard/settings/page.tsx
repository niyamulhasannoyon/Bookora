import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { db } from "@/lib/db";
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

  return <SettingsView organization={organization} />;
}
