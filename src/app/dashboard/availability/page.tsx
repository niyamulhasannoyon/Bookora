import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { AvailabilityView } from "@/components/dashboard/availability-view";
import { DayOfWeek } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardAvailabilityPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);
  const [availabilities, overrides, org] = await Promise.all([
    tenantDb.availabilities.findMany(),
    tenantDb.availabilityOverrides.findMany(),
    db.organization.findUnique({
      where: { id: tenant.organizationId },
      select: { timezone: true },
    }),
  ]);

  const weeklySchedule = availabilities.map((a) => ({
    id: a.id,
    dayOfWeek: a.dayOfWeek as DayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
    isClosed: a.isClosed,
  }));

  const serializedOverrides = overrides.map((o) => ({
    id: o.id,
    date: o.date.toISOString(),
    startTime: o.startTime,
    endTime: o.endTime,
    isAvailable: o.isAvailable,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={tenant.slug} />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar orgSlug={tenant.slug} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <AvailabilityView
            initialAvailabilities={weeklySchedule}
            initialOverrides={serializedOverrides}
            timezone={org?.timezone || "UTC"}
          />
        </main>
      </div>
    </div>
  );
}
