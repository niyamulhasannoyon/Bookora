import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock_key", {
  apiVersion: "2024-12-18.acacia" as any,
  typescript: true,
});

export function isStripeMock(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  if (
    !key ||
    key === "sk_test_mock_key" ||
    key === "sk_live_your_stripe_secret_key" ||
    key.includes("your_stripe_secret_key") ||
    process.env.NODE_ENV === "test"
  ) {
    return true;
  }
  return false;
}

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
  if (isStripeMock()) {
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

export async function createSubscriptionCheckoutSession(params: {
  organizationId: string;
  planName: string;
  planDescription: string;
  planTier: string;
  amountCents: number;
  interval: "month" | "year";
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const {
    organizationId,
    planName,
    planDescription,
    planTier,
    amountCents,
    interval,
    customerEmail,
    successUrl,
    cancelUrl,
  } = params;

  if (isStripeMock()) {
    return {
      id: `cs_sub_mock_${Date.now()}`,
      url: `${successUrl}?session_id=cs_sub_mock_${Date.now()}&plan=${planTier}`,
    };
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Bookora ${planName} Plan`,
            description: planDescription,
          },
          unit_amount: amountCents,
          recurring: {
            interval,
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      organizationId,
      planTier,
      interval,
    },
    subscription_data: {
      metadata: {
        organizationId,
        planTier,
      },
    },
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planTier}`,
    cancel_url: cancelUrl,
  });

  return session;
}

export async function createBillingPortalSession(params: {
  stripeCustomerId: string;
  returnUrl: string;
}) {
  if (isStripeMock() || !params.stripeCustomerId) {
    return {
      url: `${params.returnUrl}?notice=portal_mock`,
    };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });

  return portalSession;
}

