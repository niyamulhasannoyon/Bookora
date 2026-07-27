import { notFound, redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { ServiceList } from "@/components/services/service-list";

export const dynamic = "force-dynamic";

export default async function OrgServicesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const tenant = await getCurrentOrganization(orgSlug);

  if (!tenant) {
    redirect("/login");
  }

  const tenantDb = getTenantDb(tenant.organizationId);
  const services = await tenantDb.services.findMany(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={orgSlug} />
      <div className="flex">
        <Sidebar orgSlug={orgSlug} />
        <main className="flex-1 p-8">
          <ServiceList
            initialServices={services}
            orgSlug={orgSlug}
            userRole={tenant.role}
          />
        </main>
      </div>
    </div>
  );
}
