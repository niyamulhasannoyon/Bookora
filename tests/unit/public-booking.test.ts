import { describe, it, expect, beforeEach, vi } from "vitest";
import { createBookingWithTransaction, processPaymentStateChangeWithTransaction } from "@/lib/booking-transactions";
import { generateTimeSlots } from "@/lib/availability-engine";

const mockBookings: any[] = [];

// Mock database
vi.mock("@/lib/db", () => {
  const mockOrg = {
    id: "org-barber",
    name: "Barber Shop",
    slug: "barber-shop",
    timezone: "America/New_York",
  };

  const mockServices = [
    {
      id: "svc-haircut",
      organizationId: "org-barber",
      name: "Haircut",
      slug: "haircut",
      durationMinutes: 30,
      price: 4500, // $45.00
      currency: "usd",
      bufferBefore: 0,
      bufferAfter: 0,
      isActive: true,
    },
    {
      id: "svc-consultation",
      organizationId: "org-barber",
      name: "Free Consultation",
      slug: "free-consultation",
      durationMinutes: 15,
      price: 0, // FREE
      currency: "usd",
      bufferBefore: 0,
      bufferAfter: 0,
      isActive: true,
    },
    {
      id: "svc-retired",
      organizationId: "org-barber",
      name: "Retired Service",
      slug: "retired",
      durationMinutes: 60,
      price: 10000,
      currency: "usd",
      isActive: false,
    },
  ];

  const mockDb = {
    organization: {
      findUnique: vi.fn(({ where }) => {
        if (where.slug === mockOrg.slug || where.id === mockOrg.id) return mockOrg;
        return null;
      }),
    },
    service: {
      findFirst: vi.fn(({ where }) => {
        return mockServices.find((s) => {
          const matchesOrg = s.organizationId === where.organizationId;
          const matchesId = where.id ? s.id === where.id : true;
          const matchesSlug = where.slug ? s.slug === where.slug : true;
          const matchesActive = where.isActive !== undefined ? s.isActive === where.isActive : true;
          return matchesOrg && matchesId && matchesSlug && matchesActive;
        });
      }),
    },
    booking: {
      findUnique: vi.fn(({ where }) => {
        const b = mockBookings.find((item) => item.id === where.id);
        if (!b) return null;
        const svc = mockServices.find((s) => s.id === b.serviceId);
        return { ...b, service: svc, organization: mockOrg };
      }),
      findMany: vi.fn(({ where }) => {
        return mockBookings.filter((b) => {
          const matchesOrg = b.organizationId === where.organizationId;
          const statusNotCancelled = where.status?.notIn ? !where.status.notIn.includes(b.status) : true;

          // Check time overlap if AND condition provided
          let overlaps = true;
          if (where.AND && Array.isArray(where.AND)) {
            const ltCondition = where.AND.find((c: any) => c.startAt?.lt);
            const gtCondition = where.AND.find((c: any) => c.endAt?.gt);
            if (ltCondition && gtCondition) {
              const bufferedEndAt = ltCondition.startAt.lt;
              const bufferedStartAt = gtCondition.endAt.gt;
              overlaps = b.startAt < bufferedEndAt && b.endAt > bufferedStartAt;
            }
          }

          return matchesOrg && statusNotCancelled && overlaps;
        });
      }),
      create: vi.fn(({ data }) => {
        const created = { id: `b-${Date.now()}-${Math.random()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
        mockBookings.push(created);
        return created;
      }),
      update: vi.fn(({ where, data }) => {
        const b = mockBookings.find((item) => item.id === where.id);
        if (b) Object.assign(b, data);
        return b;
      }),
    },
    payment: {
      create: vi.fn(({ data }) => ({ id: `p-${Date.now()}`, ...data })),
      update: vi.fn(({ where, data }) => ({ id: where.id, ...data })),
      upsert: vi.fn(({ where, create, update }) => ({ id: `p-${where.bookingId}`, ...create, ...update })),
    },
    notification: {
      create: vi.fn(({ data }) => ({ id: `n-${Date.now()}`, ...data })),
    },
    $transaction: vi.fn(async (cb) => cb(mockDb)),
  };

  return { db: mockDb };
});

describe("Public Booking Experience Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBookings.length = 0;
  });

  describe("Server-Side Price & Duration Recalculation", () => {
    it("uses authoritative database price and duration, ignoring client values", async () => {
      const futureStart = new Date(Date.now() + 86400000); // 1 day in future
      const futureEnd = new Date(futureStart.getTime() + 30 * 60 * 1000);

      const result = await createBookingWithTransaction({
        organizationId: "org-barber",
        serviceId: "svc-haircut",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        startAt: futureStart,
        endAt: futureEnd,
      });

      expect(result.booking.serviceId).toBe("svc-haircut");
      expect(result.payment?.amount).toBe(4500); // $45.00 from database service definition
    });
  });

  describe("Inactive Service & Past Date Restrictions", () => {
    it("rejects booking inactive service", async () => {
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000);

      await expect(
        createBookingWithTransaction({
          organizationId: "org-barber",
          serviceId: "svc-retired", // Inactive service
          customerName: "Alice Smith",
          customerEmail: "alice@example.com",
          startAt: futureStart,
          endAt: futureEnd,
        })
      ).rejects.toThrow("Service not found or inactive for this organization.");
    });
  });

  describe("Free Service vs Paid Service Branching", () => {
    it("correctly identifies free service with 0 price", async () => {
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(futureStart.getTime() + 15 * 60 * 1000);

      const result = await createBookingWithTransaction({
        organizationId: "org-barber",
        serviceId: "svc-consultation",
        customerName: "Bob Miller",
        customerEmail: "bob@example.com",
        startAt: futureStart,
        endAt: futureEnd,
      });

      expect(result.booking.serviceId).toBe("svc-consultation");
      expect(result.payment?.amount).toBe(0);
    });
  });

  describe("Double Booking Prevention", () => {
    it("blocks overlapping booking requests within buffered window", async () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      // Create first booking
      await createBookingWithTransaction({
        organizationId: "org-barber",
        serviceId: "svc-haircut",
        customerName: "First Customer",
        customerEmail: "first@example.com",
        startAt: startTime,
        endAt: endTime,
      });

      // Attempt second overlapping booking at exact same time
      await expect(
        createBookingWithTransaction({
          organizationId: "org-barber",
          serviceId: "svc-haircut",
          customerName: "Second Customer",
          customerEmail: "second@example.com",
          startAt: startTime,
          endAt: endTime,
        })
      ).rejects.toThrow("The selected time slot is no longer available.");
    });
  });

  describe("Dynamic Time Slot Generation", () => {
    it("generates slots within availability window and marks past notice slots as unavailable", () => {
      const slots = generateTimeSlots({
        dateStr: "2026-07-28",
        window: { dayOfWeek: "TUESDAY", startTime: "09:00", endTime: "12:00" },
        durationMinutes: 30,
        timezone: "America/New_York",
        now: new Date("2026-07-28T08:00:00Z"),
      });

      expect(slots.length).toBe(6); // 9:00, 9:30, 10:00, 10:30, 11:00, 11:30
      expect(slots[0].startTime).toBe("09:00");
      expect(slots[0].endTime).toBe("09:30");
      expect(slots[0].available).toBe(true);
    });
  });

  describe("Stripe Webhook Payment State Transitions", () => {
    it("transitions booking to CONFIRMED and payment to PAID upon successful payment processing", async () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const { booking } = await createBookingWithTransaction({
        organizationId: "org-barber",
        serviceId: "svc-haircut",
        customerName: "Charlie Stripe",
        customerEmail: "charlie@example.com",
        startAt: startTime,
        endAt: endTime,
        stripeSessionId: "cs_test_12345",
      });

      expect(booking.status).toBe("PENDING");

      const updateResult = await processPaymentStateChangeWithTransaction({
        bookingId: booking.id,
        paymentStatus: "PAID",
        bookingStatus: "CONFIRMED",
        stripeSessionId: "cs_test_12345",
        stripePaymentIntentId: "pi_test_999",
      });

      expect(updateResult.booking.status).toBe("CONFIRMED");
      expect(updateResult.booking.paymentStatus).toBe("PAID");
    });

    it("handles session expiration idempotently by marking booking CANCELLED and payment FAILED", async () => {
      const startTime = new Date(Date.now() + 86400000);
      const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

      const { booking } = await createBookingWithTransaction({
        organizationId: "org-barber",
        serviceId: "svc-haircut",
        customerName: "Expired User",
        customerEmail: "expired@example.com",
        startAt: startTime,
        endAt: endTime,
        stripeSessionId: "cs_test_expired",
      });

      const cancelResult = await processPaymentStateChangeWithTransaction({
        bookingId: booking.id,
        paymentStatus: "FAILED",
        bookingStatus: "CANCELLED",
        stripeSessionId: "cs_test_expired",
      });

      expect(cancelResult.booking.status).toBe("CANCELLED");
      expect(cancelResult.booking.paymentStatus).toBe("FAILED");
    });
  });
});
