import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { ServiceList } from "@/components/services/service-list";

export const dynamic = "force-dynamic";

export default async function DashboardServicesPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);
  const services = await tenantDb.services.findMany(false);

  return (
    <ServiceList
      initialServices={services}
      orgSlug={tenant.slug}
      userRole={tenant.role}
    />
  );
}
