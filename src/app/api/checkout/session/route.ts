import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createBookingCheckoutSession } from "@/lib/stripe";
import { parse } from "date-fns";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMITS } from "@/lib/rate-limiter";
import { withCsrfProtection } from "@/lib/csrf";

const checkoutInputSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
  orgSlug: z.string().min(1, "Organization slug is required"),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/, "Slot time must be in HH:mm format"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerEmail: z.string().email("Please enter a valid email address"),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
});

const rawPostHandler = async (req: Request) => {
  // Rate limiting
  const identifier = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, DEFAULT_RATE_LIMITS.CHECKOUT);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const body = await req.json();

    // Zod input validation
    const validationResult = checkoutInputSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      serviceId,
      orgSlug,
      dateStr,
      slotTime,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = validationResult.data;

    const organization = await db.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const service = await db.service.findFirst({
      where: {
        id: serviceId,
        organizationId: organization.id, // SECURITY: Verify service belongs to this organization
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found for this organization" }, { status: 404 });
    }

    const startDateTime = parse(`${dateStr} ${slotTime}`, "yyyy-MM-dd HH:mm", new Date());
    const endDateTime = new Date(startDateTime.getTime() + service.durationMinutes * 60 * 1000);

    // Create PENDING booking in database
    const booking = await db.booking.create({
      data: {
        organizationId: organization.id,
        serviceId: service.id,
        customerName,
        customerEmail,
        customerPhone,
        notes,
        startAt: startDateTime,
        endAt: endDateTime,
        status: "PENDING",
        paymentStatus: "UNPAID",
      },
    });

    const origin = req.headers.get("origin") || "http://localhost:3000";

    const checkoutSession = await createBookingCheckoutSession({
      bookingId: booking.id,
      serviceName: service.name,
      serviceDescription: service.description || undefined,
      amountCents: service.price,
      currency: service.currency,
      customerEmail,
      orgSlug,
      successUrl: `${origin}/${orgSlug}/booking/success`,
      cancelUrl: `${origin}/${orgSlug}/${service.slug}`,
    });

    // Save payment record with Stripe Session ID
    await db.payment.create({
      data: {
        bookingId: booking.id,
        stripeSessionId: checkoutSession.id,
        amount: service.price,
        currency: service.currency,
        status: "PENDING",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
};

export const POST = withCsrfProtection(rawPostHandler);
