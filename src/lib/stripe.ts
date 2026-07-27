import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_key", {
  apiVersion: "2024-12-18.acacia" as any,
  typescript: true,
});

export async function createBookingCheckoutSession(params: {
  bookingId: string;
  serviceName: string;
  serviceDescription?: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  orgSlug: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const {
    bookingId,
    serviceName,
    serviceDescription,
    amountCents,
    currency,
    customerEmail,
    orgSlug,
    successUrl,
    cancelUrl,
  } = params;

  // In test/mock mode if no real key provided
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_mock_key") {
    return {
      id: `cs_test_mock_${Date.now()}`,
      url: `${successUrl}?session_id=cs_test_mock_${Date.now()}&booking_id=${bookingId}`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `${serviceName} Appointment`,
            description: serviceDescription || `Booking for ${serviceName}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      bookingId,
      orgSlug,
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
    cancel_url: cancelUrl,
  });

  return session;
}
