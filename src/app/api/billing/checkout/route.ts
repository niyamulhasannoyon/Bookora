import { NextResponse } from "next/server";
import { getCurrentOrganization, requirePermission } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth";
import { getPlanDetails, PlanTier } from "@/lib/plans";
import { createSubscriptionCheckoutSession } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await getCurrentOrganization();
    if (!tenant) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Only OWNER can manage subscriptions
    if (tenant.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only the organization owner can change billing plans." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { planTier, interval = "month" } = body;

    if (planTier !== "PRO" && planTier !== "ENTERPRISE") {
      return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
    }

    const plan = getPlanDetails(planTier as PlanTier);
    const amountCents = interval === "year" ? plan.priceYearlyCents : plan.priceMonthlyCents;

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/dashboard/billing`;
    const cancelUrl = `${baseUrl}/dashboard/billing`;

    const session = await createSubscriptionCheckoutSession({
      organizationId: tenant.organizationId,
      planName: plan.name,
      planDescription: plan.tagline,
      planTier,
      amountCents,
      interval: interval === "year" ? "year" : "month",
      customerEmail: user.email,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Subscription checkout error:", err);
    return NextResponse.json({ error: err.message || "Failed to create checkout session." }, { status: 500 });
  }
}
