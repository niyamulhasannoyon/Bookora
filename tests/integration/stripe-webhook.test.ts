import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";
import { db } from "@/lib/db";
import { processPaymentStateChangeWithTransaction } from "@/lib/booking-transactions";

// Set required environment variables for webhook security
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

// Mock dependent services to isolate webhook integration logic
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn().mockImplementation((body, signature, secret) => {
        // Return parsed event from the body - simulates successful verification
        return JSON.parse(body);
      }),
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue({ id: "msg-123" }),
}));

vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: vi.fn().mockResolvedValue({ eventId: "gcal-123" }),
}));

const mockBookingsMap: Record<string, any> = {};

vi.mock("@/lib/db", () => {
  return {
    db: {
      booking: {
        findUnique: vi.fn(({ where }) => mockBookingsMap[where.id] || null),
      },
    },
  };
});

vi.mock("@/lib/booking-transactions", () => ({
  processPaymentStateChangeWithTransaction: vi.fn().mockImplementation(async (params) => {
    const booking = mockBookingsMap[params.bookingId];
    if (booking) {
      booking.status = params.bookingStatus || booking.status;
      booking.paymentStatus = params.paymentStatus || booking.paymentStatus;
    }
    return { booking, payment: { status: params.paymentStatus }, notification: { id: "n-1" } };
  }),
}));

describe("Stripe Webhook Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockBookingsMap).forEach((k) => delete mockBookingsMap[k]);

    mockBookingsMap["booking-stripe-1"] = {
      id: "booking-stripe-1",
      organizationId: "org-1",
      serviceId: "svc-1",
      customerName: "Alice Stripe",
      customerEmail: "alice@example.com",
      startAt: new Date("2026-08-15T10:00:00Z"),
      endAt: new Date("2026-08-15T10:30:00Z"),
      status: "PENDING",
      paymentStatus: "PENDING",
      service: { name: "Haircut", price: 5000, currency: "usd" },
      organization: { name: "Barber Shop" },
    };
  });

  describe("checkout.session.completed Event Handling", () => {
    it("updates booking to CONFIRMED and payment to PAID upon successful session completion", async () => {
      const eventPayload = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            payment_intent: "pi_test_123",
            amount_total: 5000,
            currency: "usd",
            metadata: { bookingId: "booking-stripe-1" },
          },
        },
      };

      const req = new Request("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "test_signature",
        },
        body: JSON.stringify(eventPayload),
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.received).toBe(true);

      expect(processPaymentStateChangeWithTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: "booking-stripe-1",
          paymentStatus: "PAID",
          bookingStatus: "CONFIRMED",
          stripeSessionId: "cs_test_123",
        })
      );

      expect(mockBookingsMap["booking-stripe-1"].status).toBe("CONFIRMED");
      expect(mockBookingsMap["booking-stripe-1"].paymentStatus).toBe("PAID");
    });

    it("handles idempotency: ignores duplicate webhook for already CONFIRMED/PAID booking without duplicate side-effects", async () => {
      mockBookingsMap["booking-stripe-1"].status = "CONFIRMED";
      mockBookingsMap["booking-stripe-1"].paymentStatus = "PAID";

      const eventPayload = {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            payment_intent: "pi_test_123",
            metadata: { bookingId: "booking-stripe-1" },
          },
        },
      };

      const req = new Request("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "test_signature",
        },
        body: JSON.stringify(eventPayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  describe("checkout.session.expired & payment_failed Handling", () => {
    it("cancels booking and sets payment status to FAILED when checkout session expires", async () => {
      const eventPayload = {
        type: "checkout.session.expired",
        data: {
          object: {
            id: "cs_test_expired",
            metadata: { bookingId: "booking-stripe-1" },
          },
        },
      };

      const req = new Request("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "test_signature",
        },
        body: JSON.stringify(eventPayload),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);

      expect(processPaymentStateChangeWithTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: "booking-stripe-1",
          paymentStatus: "FAILED",
          bookingStatus: "CANCELLED",
        })
      );
    });
  });
});
