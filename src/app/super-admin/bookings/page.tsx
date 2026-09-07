import { getAllPlatformBookingsAction } from "@/actions/super-admin";
import { GlobalBookingsTable } from "@/components/super-admin/global-bookings-table";

export const dynamic = "force-dynamic";

export default async function SuperAdminBookingsPage() {
  const result = await getAllPlatformBookingsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Platform Global Bookings Audit
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Monitor real-time booking transactions, confirmation statuses, and revenue activity across all tenant businesses.
        </p>
      </div>

      {result.success && result.data ? (
        <GlobalBookingsTable initialBookings={result.data} />
      ) : (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl">
          <p className="text-rose-400 font-medium">Failed to load platform bookings: {result.error}</p>
        </div>
      )}
    </div>
  );
}
