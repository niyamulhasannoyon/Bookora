import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { BillingView } from "@/components/dashboard/billing-view";

export const dynamic = "force-dynamic";

export default async function DashboardBillingPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);

  const [bookingsCount, servicesCount, membersCount, paidPayments] = await Promise.all([
    db.booking.count({ where: { organizationId: tenant.organizationId } }),
    db.service.count({ where: { organizationId: tenant.organizationId, isActive: true } }),
    db.organizationMember.count({ where: { organizationId: tenant.organizationId } }),
    db.payment.aggregate({
      where: {
        booking: { organizationId: tenant.organizationId },
        status: "SUCCEEDED",
      },
      _sum: { amount: true },
    }),
  ]);

  const stats = {
    bookingsThisMonth: bookingsCount,
    activeServicesCount: servicesCount,
    teamMembersCount: membersCount,
    totalRevenueInCents: paidPayments._sum.amount || 0,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={tenant.slug} />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar orgSlug={tenant.slug} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <BillingView stats={stats} />
        </main>
      </div>
    </div>
  );
}
