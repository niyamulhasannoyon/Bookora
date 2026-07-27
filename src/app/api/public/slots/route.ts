import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailableSlots } from "@/lib/availability-engine";
import { formatInTimeZone } from "date-fns-tz";
import { isBefore, startOfDay } from "date-fns";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMITS } from "@/lib/rate-limiter";

export async function GET(req: Request) {
  // Rate limiting: max 60 slot queries per minute per IP
  const identifier = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, DEFAULT_RATE_LIMITS.SLOTS_QUERY);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  try {
    const { searchParams } = new URL(req.url);
    const orgSlug = searchParams.get("orgSlug");
    const serviceId = searchParams.get("serviceId");
    const dateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!orgSlug || !serviceId || !dateStr) {
      return NextResponse.json(
        { error: "Missing required query parameters: orgSlug, serviceId, and date are required." },
        { status: 400 }
      );
    }

    // 1. Fetch organization
    const organization = await db.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    // 2. Fetch service and verify active state
    const service = await db.service.findFirst({
      where: {
        id: serviceId,
        organizationId: organization.id,
        isActive: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or is currently inactive." },
        { status: 404 }
      );
    }

    // 3. Verify date is not in the past relative to organization timezone
    const timezone = organization.timezone || "UTC";
    const todayStr = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");

    if (dateStr < todayStr) {
      return NextResponse.json(
        { error: "Cannot query availability for past dates." },
        { status: 400 }
      );
    }

    // 4. Fetch available time slots dynamically using availability engine
    const slots = await getAvailableSlots({
      organizationId: organization.id,
      serviceId: service.id,
      date: dateStr,
      now: new Date(),
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        timezone,
      },
      service: {
        id: service.id,
        name: service.name,
        durationMinutes: service.durationMinutes,
        price: service.price,
        currency: service.currency,
      },
      date: dateStr,
      timezone,
      slots,
    });
  } catch (error: any) {
    console.error("Public slots API error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred while fetching availability." },
      { status: 500 }
    );
  }
}
