import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createBookingWithTransaction } from "@/lib/booking-transactions";
import { createBookingCheckoutSession } from "@/lib/stripe";
import { sendBookingConfirmation } from "@/lib/email";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { isBefore } from "date-fns";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMITS } from "@/lib/rate-limiter";
import { withCsrfProtection } from "@/lib/csrf";

// Zod schema for public booking input validation
const publicBookingInputSchema = z.object({
  orgSlug: z.string().min(1, "Organization slug is required"),
  serviceId: z.string().min(1, "Service ID is required"),
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  slotTime: z.string().regex(/^\d{2}:\d{2}$/, "Slot time must be in HH:mm format"),
  customerName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  customerEmail: z.string().email("Please enter a valid email address"),
  customerPhone: z.string().max(30, "Phone number is too long").optional().nullable(),
  notes: z.string().max(1000, "Notes are too long").optional().nullable(),
});

const rawPostHandler = async (req: Request) => {
  // Rate limiting: max 10 booking requests per minute per IP
  const identifier = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, DEFAULT_RATE_LIMITS.BOOKING_CREATE);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  try {
    const body = await req.json();

    // Zod input validation
    const validationResult = publicBookingInputSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMsg = validationResult.error.errors.map((e) => e.message).join(", ");
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const {
      orgSlug,
      serviceId,
      dateStr,
      slotTime,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = validationResult.data;

    // 1. Fetch organization
    const organization = await db.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const timezone = organization.timezone || "UTC";

    // 2. Fetch service & verify active state (NEVER trust client price or duration)
    const service = await db.service.findFirst({
      where: {
        id: serviceId,
        organizationId: organization.id,
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found for this organization." }, { status: 404 });
    }

    if (!service.isActive) {
      return NextResponse.json(
        { error: "This service is currently inactive and cannot be booked." },
        { status: 400 }
      );
    }

    // 3. Recalculate startAt and endAt server-side in target timezone
    // Construct ISO string for local time: "YYYY-MM-DDTHH:mm:00"
    const startAtUtc = fromZonedTime(`${dateStr}T${slotTime}:00`, timezone);
    const durationMinutes = service.durationMinutes || 30;
    const endAtUtc = new Date(startAtUtc.getTime() + durationMinutes * 60 * 1000);

    const now = new Date();
    if (isBefore(startAtUtc, now)) {
      return NextResponse.json(
        { error: "Selected slot time is in the past. Please select a future date and time." },
        { status: 400 }
      );
    }

    // 4. Create booking atomically with zero double-booking guarantee
    let bookingResult;
    try {
      bookingResult = await createBookingWithTransaction({
        organizationId: organization.id,
        serviceId: service.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerPhone: customerPhone ? customerPhone.trim() : undefined,
        notes: notes ? notes.trim() : undefined,
        startAt: startAtUtc,
        endAt: endAtUtc,
        timezone,
        amountCents: service.price,
      });
    } catch (txErr: any) {
      return NextResponse.json(
        { error: txErr.message || "The selected time slot is no longer available. Please select another time." },
        { status: 409 } // Conflict / double booking
      );
    }

    const { booking } = bookingResult;
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:3000";
    const cleanOrigin = origin.replace(/\/$/, "");

    // 5. Handle Free Services vs Paid Services
    if (service.price === 0) {
      // Free service: Directly confirm booking
      await db.booking.update({
        where: { id: booking.id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
        },
      });

      if (bookingResult.payment) {
        await db.payment.update({
          where: { id: bookingResult.payment.id },
          data: { status: "SUCCEEDED" },
        });
      }

      // Non-blocking transactional email notification
      sendBookingConfirmation(booking.id).catch((err) =>
        console.error("Non-blocking email confirmation error:", err)
      );

      const confirmationUrl = `/book/${orgSlug}/confirmation?bookingId=${booking.id}`;
      return NextResponse.json({
        success: true,
        isFree: true,
        bookingId: booking.id,
        redirectUrl: confirmationUrl,
      });
    }

    // Paid service: Create Stripe Checkout Session
    const successUrl = `${cleanOrigin}/book/${orgSlug}/confirmation`;
    const cancelUrl = `${cleanOrigin}/book/${orgSlug}?serviceId=${service.id}`;

    const checkoutSession = await createBookingCheckoutSession({
      bookingId: booking.id,
      serviceName: service.name,
      serviceDescription: service.description || undefined,
      amountCents: service.price,
      currency: service.currency || "usd",
      customerEmail: customerEmail.trim().toLowerCase(),
      orgSlug,
      successUrl,
      cancelUrl,
    });

    // Update payment record with stripe session ID
    if (bookingResult.payment && checkoutSession.id) {
      await db.payment.update({
        where: { id: bookingResult.payment.id },
        data: { stripeSessionId: checkoutSession.id },
      });
    }

    return NextResponse.json({
      success: true,
      isFree: false,
      bookingId: booking.id,
      checkoutUrl: checkoutSession.url,
    });    } catch (error: any) {
    console.error("Public booking API error:", error);
    return NextResponse.json(
      { error: error?.message || "An error occurred while creating your booking." },
      { status: 500 }
    );
  }
};

export const POST = withCsrfProtection(rawPostHandler);

