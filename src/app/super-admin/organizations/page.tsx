import { getAllOrganizationsAction } from "@/actions/super-admin";
import { OrganizationsTable } from "@/components/super-admin/organizations-table";

export const dynamic = "force-dynamic";

export default async function SuperAdminOrganizationsPage() {
  const result = await getAllOrganizationsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Organization Directory & Tenant Management
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Manage all tenant organizations, override subscription plan tiers, and manage suspension locks.
        </p>
      </div>

      {result.success && result.data ? (
        <OrganizationsTable initialOrganizations={result.data} />
      ) : (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl">
          <p className="text-rose-400 font-medium">Failed to load organizations: {result.error}</p>
        </div>
      )}
    </div>
  );
}
