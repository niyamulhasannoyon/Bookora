import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createBillingPortalSession } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await getCurrentOrganization();
    if (!tenant) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    if (tenant.role !== "OWNER") {
      return NextResponse.json(
        { error: "Forbidden: Only organization owners can access the customer portal." },
        { status: 403 }
      );
    }

    const org = await db.organization.findUnique({
      where: { id: tenant.organizationId },
      select: { stripeCustomerId: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const returnUrl = `${baseUrl}/dashboard/billing`;

    const portal = await createBillingPortalSession({
      stripeCustomerId: org?.stripeCustomerId || "",
      returnUrl,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: any) {
    console.error("Billing portal error:", err);
    return NextResponse.json({ error: err.message || "Failed to open billing portal." }, { status: 500 });
  }
}
