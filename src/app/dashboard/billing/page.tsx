import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { db } from "@/lib/db";
import { BillingView } from "@/components/dashboard/billing-view";
import { PlanTier } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardBillingPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const [org, bookingsCount, servicesCount, membersCount, paidPayments] = await Promise.all([
    db.organization.findUnique({
      where: { id: tenant.organizationId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
      },
    }),
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

  const subscription = {
    plan: (org?.subscriptionPlan?.toUpperCase() || "FREE") as PlanTier,
    status: org?.subscriptionStatus || "ACTIVE",
    stripeCustomerId: org?.stripeCustomerId || null,
    currentPeriodEnd: org?.currentPeriodEnd ? org.currentPeriodEnd.toISOString() : null,
  };

  return <BillingView stats={stats} subscription={subscription} />;
}
