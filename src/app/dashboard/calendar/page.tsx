import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { DashboardCalendarView } from "@/components/dashboard/dashboard-calendar-view";

export const dynamic = "force-dynamic";

export default async function DashboardCalendarPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);

  const [rawBookings, googleConn] = await Promise.all([
    tenantDb.bookings.findMany(),
    db.googleCalendarConnection.findFirst({
      where: { organizationId: tenant.organizationId },
    }),
  ]);

  const bookings = rawBookings.map((b) => ({
    id: b.id,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    notes: b.notes,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    status: b.status,
    service: {
      id: b.service.id,
      name: b.service.name,
      price: b.service.price,
      durationMinutes: b.service.durationMinutes,
    },
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={tenant.slug} />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar orgSlug={tenant.slug} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <DashboardCalendarView
            initialBookings={bookings}
            googleConnected={!!googleConn}
          />
        </main>
      </div>
    </div>
  );
}
