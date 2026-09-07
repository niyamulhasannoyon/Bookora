import { db } from "@/lib/db";

export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export interface PlanDetails {
  id: PlanTier;
  name: string;
  tagline: string;
  badge?: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
  limits: {
    maxServices: number;
    maxStaff: number;
    maxBookingsPerMonth: number;
    googleCalendarSync: boolean;
    customBranding: boolean;
  };
  features: string[];
}

export const SAAS_PLANS: Record<PlanTier, PlanDetails> = {
  FREE: {
    id: "FREE",
    name: "Free Starter",
    tagline: "Ideal for solo service professionals just starting out.",
    priceMonthlyCents: 0,
    priceYearlyCents: 0,
    limits: {
      maxServices: 3,
      maxStaff: 1,
      maxBookingsPerMonth: 50,
      googleCalendarSync: false,
      customBranding: false,
    },
    features: [
      "Up to 3 Active Services",
      "1 Team Member (Solo Owner)",
      "Up to 50 Bookings per month",
      "Instant Email Confirmations",
      "Shareable Booking Link & QR Code",
      "Weekly Schedule & Break Times",
    ],
  },
  PRO: {
    id: "PRO",
    name: "Professional",
    tagline: "For growing salons, clinics, consultants, and studios.",
    badge: "Most Popular",
    priceMonthlyCents: 2900, // $29.00 / mo
    priceYearlyCents: 29000, // $290.00 / yr (~$24/mo, save 17%)
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly",
    stripeYearlyPriceId: process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly",
    limits: {
      maxServices: 15,
      maxStaff: 5,
      maxBookingsPerMonth: 1000,
      googleCalendarSync: true,
      customBranding: true,
    },
    features: [
      "Everything in Free",
      "Up to 15 Active Services",
      "Up to 5 Team Members & Staff",
      "Up to 1,000 Bookings per month",
      "Google Calendar 2-Way Sync",
      "Automated Reminders (24h & 1h)",
      "Advance Notice & Custom Buffer Times",
      "Direct Stripe Card Payments",
    ],
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "For established businesses, multi-staff clinics & agencies.",
    priceMonthlyCents: 7900, // $79.00 / mo
    priceYearlyCents: 79000, // $790.00 / yr
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_enterprise_monthly",
    stripeYearlyPriceId: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || "price_enterprise_yearly",
    limits: {
      maxServices: 999,
      maxStaff: 999,
      maxBookingsPerMonth: 99999,
      googleCalendarSync: true,
      customBranding: true,
    },
    features: [
      "Everything in Pro",
      "Unlimited Active Services",
      "Unlimited Team Members",
      "Unlimited Monthly Bookings",
      "Priority 24/7 Support",
      "Custom Website Embed & Widgets",
      "Audit Trail & Advanced Analytics",
      "Dedicated Account Manager",
    ],
  },
};

/**
 * Normalizes and retrieves plan details
 */
export function getPlanDetails(tier?: string | null): PlanDetails {
  const normalized = (tier?.toUpperCase() || "FREE") as PlanTier;
  return SAAS_PLANS[normalized] || SAAS_PLANS.FREE;
}

/**
 * Checks whether an organization is allowed to add more of a given resource
 */
export async function checkOrganizationPlanLimit(
  organizationId: string,
  resource: "services" | "staff" | "bookings"
): Promise<{ allowed: boolean; currentCount: number; maxAllowed: number; plan: PlanTier; error?: string }> {
  try {
    if (!db?.organization?.findUnique) {
      return { allowed: true, currentCount: 0, maxAllowed: Infinity, plan: "PRO" };
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionPlan: true, isSuspended: true },
    });

    if (!org) {
      return { allowed: true, currentCount: 0, maxAllowed: Infinity, plan: "PRO" };
    }

    if (org.isSuspended) {
      return {
        allowed: false,
        currentCount: 0,
        maxAllowed: 0,
        plan: (org.subscriptionPlan as PlanTier) || "FREE",
        error: "This organization is suspended. Please contact platform support.",
      };
    }

    const plan = getPlanDetails(org.subscriptionPlan);

    if (resource === "services") {
      const count = db.service?.count
        ? await db.service.count({
            where: { organizationId, isActive: true },
          })
        : 0;
      const allowed = count < plan.limits.maxServices;
      return {
        allowed,
        currentCount: count,
        maxAllowed: plan.limits.maxServices,
        plan: plan.id,
        error: allowed
          ? undefined
          : `Service limit reached for your current plan (${plan.name}: maximum ${plan.limits.maxServices} services). Please upgrade to add more.`,
      };
    }

    if (resource === "staff") {
      let count = 0;
      if (db.organizationMember?.count) {
        try {
          count = await db.organizationMember.count({
            where: { organizationId },
          });
        } catch {
          count = 0;
        }
      }
      const allowed = count < plan.limits.maxStaff;
      return {
        allowed,
        currentCount: count,
        maxAllowed: plan.limits.maxStaff,
        plan: plan.id,
        error: allowed
          ? undefined
          : `Team capacity reached for your current plan (${plan.name}: maximum ${plan.limits.maxStaff} staff). Please upgrade to add more members.`,
      };
    }

    if (resource === "bookings") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const count = db.booking?.count
        ? await db.booking.count({
            where: {
              organizationId,
              createdAt: { gte: startOfMonth },
            },
          })
        : 0;

      const allowed = count < plan.limits.maxBookingsPerMonth;
      return {
        allowed,
        currentCount: count,
        maxAllowed: plan.limits.maxBookingsPerMonth,
        plan: plan.id,
        error: allowed
          ? undefined
          : `Monthly booking volume limit reached (${plan.name}: maximum ${plan.limits.maxBookingsPerMonth} bookings/month). Please upgrade your plan.`,
      };
    }

    return { allowed: true, currentCount: 0, maxAllowed: Infinity, plan: plan.id };
  } catch {
    return { allowed: true, currentCount: 0, maxAllowed: Infinity, plan: "PRO" };
  }
}
