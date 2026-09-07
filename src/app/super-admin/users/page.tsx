import { getAllUsersAction } from "@/actions/super-admin";
import { UsersTable } from "@/components/super-admin/users-table";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage() {
  const result = await getAllUsersAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Platform Users & Access Management
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          View all registered accounts across all tenant organizations and grant or revoke Super Admin privileges.
        </p>
      </div>

      {result.success && result.data ? (
        <UsersTable initialUsers={result.data} />
      ) : (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl">
          <p className="text-rose-400 font-medium">Failed to load platform users: {result.error}</p>
        </div>
      )}
    </div>
  );
}
