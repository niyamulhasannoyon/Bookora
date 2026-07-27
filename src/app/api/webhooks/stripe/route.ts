import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { createCalendarEvent } from "@/lib/google-calendar";
import { formatPrice } from "@/lib/utils";
import { processPaymentStateChangeWithTransaction } from "@/lib/booking-transactions";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[SECURITY] STRIPE_WEBHOOK_SECRET is not configured. Webhook endpoint is disabled.");
    return NextResponse.json(
      { error: "Webhook not configured. Please set STRIPE_WEBHOOK_SECRET in your environment." },
      { status: 500 }
    );
  }

  if (!signature) {
    console.error("[SECURITY] Stripe webhook called without stripe-signature header.");
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 401 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
          // Fetch existing booking first to check for idempotency
          const existingBooking = await db.booking.findUnique({
            where: { id: bookingId },
            include: {
              organization: true,
              service: true,
            },
          });

          if (!existingBooking) {
            console.warn(`Webhook received for non-existent booking: ${bookingId}`);
            break;
          }

          // Idempotency check: If already CONFIRMED and PAID, acknowledge without re-sending emails
          const isAlreadyProcessed =
            existingBooking.status === "CONFIRMED" && existingBooking.paymentStatus === "PAID";

          // Process state update in atomic transaction
          await processPaymentStateChangeWithTransaction({
            bookingId: existingBooking.id,
            paymentStatus: "PAID",
            bookingStatus: "CONFIRMED",
            stripeSessionId: session.id,
            stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            paymentAmount: session.amount_total || existingBooking.service.price,
            currency: session.currency || existingBooking.service.currency,
          });

          // Only perform side effects (Google Calendar & Email) if not previously confirmed
          if (!isAlreadyProcessed) {
            // Google Calendar integration
            try {
              await createCalendarEvent({ bookingId: existingBooking.id });
            } catch (gcalErr) {
              console.error("Failed to sync Google Calendar event:", gcalErr);
            }

            // Resend email confirmation
            try {
              await sendBookingConfirmationEmail({
                customerEmail: existingBooking.customerEmail,
                customerName: existingBooking.customerName,
                serviceName: existingBooking.service.name,
                organizationName: existingBooking.organization.name,
                startTimeFormatted: format(existingBooking.startAt, "EEEE, MMMM d, yyyy 'at' h:mm a"),
                priceFormatted: formatPrice(existingBooking.service.price, existingBooking.service.currency),
                bookingId: existingBooking.id,
              });
            } catch (emailErr) {
              console.error("Failed to send booking confirmation email:", emailErr);
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
          // Checkout session expired before completion - release slot by cancelling booking
          await processPaymentStateChangeWithTransaction({
            bookingId,
            paymentStatus: "FAILED",
            bookingStatus: "CANCELLED",
            stripeSessionId: session.id,
          });
        }
        break;
      }

      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed": {
        const session = event.data.object;
        const bookingId = session.metadata?.bookingId;

        if (bookingId) {
          await processPaymentStateChangeWithTransaction({
            bookingId,
            paymentStatus: "FAILED",
            bookingStatus: "CANCELLED",
          });
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err: any) {
    console.error("Stripe webhook processing error:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
