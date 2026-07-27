import { describe, it, expect, vi, beforeEach } from "vitest";
import { encryptToken, decryptToken } from "@/lib/encryption";
import { createBookingWithTransaction, processPaymentStateChangeWithTransaction } from "@/lib/booking-transactions";

describe("Encryption & Decryption Unit Tests", () => {
  it("encrypts plaintext token and decrypts it back correctly", () => {
    const originalToken = "ya29.a0Axoo-mock-google-oauth-access-token-12345";
    const encrypted = encryptToken(originalToken);

    expect(encrypted).not.toBe(originalToken);
    expect(encrypted).toContain(":");

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(originalToken);
  });

  it("handles unencrypted/empty tokens gracefully", () => {
    expect(decryptToken("")).toBe("");
    expect(decryptToken("plain_string_without_colons")).toBe("plain_string_without_colons");
  });
});

describe("Booking & Payment Database Transactions Unit Tests", () => {
  let mockTx: any;

  beforeEach(() => {
    mockTx = {
      service: {
        findFirst: vi.fn(),
      },
      booking: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        upsert: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
    };
  });

  it("successfully creates booking, payment, and notification in transaction when slot is available", async () => {
    const startAt = new Date("2026-08-01T10:00:00Z");
    const endAt = new Date("2026-08-01T10:30:00Z");

    mockTx.service.findFirst.mockResolvedValue({
      id: "svc-1",
      organizationId: "org-1",
      name: "Haircut",
      price: 5000,
      currency: "usd",
      isActive: true,
    });

    mockTx.booking.findMany.mockResolvedValue([]); // No overlapping bookings

    mockTx.booking.create.mockResolvedValue({
      id: "bk-1",
      organizationId: "org-1",
      serviceId: "svc-1",
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      startAt,
      endAt,
      status: "PENDING",
      paymentStatus: "PENDING",
    });

    mockTx.payment.create.mockResolvedValue({
      id: "pay-1",
      bookingId: "bk-1",
      stripeSessionId: "cs_123",
      amount: 5000,
      currency: "usd",
      status: "PENDING",
    });

    mockTx.notification.create.mockResolvedValue({
      id: "notif-1",
      bookingId: "bk-1",
      type: "BOOKING_CONFIRMATION",
      status: "PENDING",
    });

    const result = await createBookingWithTransaction(
      {
        organizationId: "org-1",
        serviceId: "svc-1",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        startAt,
        endAt,
        stripeSessionId: "cs_123",
      },
      mockTx
    );

    expect(result.booking.id).toBe("bk-1");
    expect(result.payment?.id).toBe("pay-1");
    expect(result.notification.type).toBe("BOOKING_CONFIRMATION");
    expect(mockTx.booking.findMany).toHaveBeenCalled();
    expect(mockTx.booking.create).toHaveBeenCalled();
  });

  it("throws error and aborts transaction if requested time slot is double-booked", async () => {
    const startAt = new Date("2026-08-01T10:00:00Z");
    const endAt = new Date("2026-08-01T10:30:00Z");

    mockTx.service.findFirst.mockResolvedValue({
      id: "svc-1",
      organizationId: "org-1",
      price: 5000,
      isActive: true,
    });

    // Simulate existing overlapping booking
    mockTx.booking.findMany.mockResolvedValue([
      { id: "existing-bk", startAt, endAt },
    ]);

    await expect(
      createBookingWithTransaction(
        {
          organizationId: "org-1",
          serviceId: "svc-1",
          customerName: "Jane Doe",
          customerEmail: "jane@example.com",
          startAt,
          endAt,
        },
        mockTx
      )
    ).rejects.toThrow("The selected time slot is no longer available.");

    expect(mockTx.booking.create).not.toHaveBeenCalled();
  });

  it("atomically processes payment state changes", async () => {
    mockTx.booking.findUnique.mockResolvedValue({
      id: "bk-1",
      status: "PENDING",
      service: { price: 5000, currency: "usd" },
    });

    mockTx.booking.update.mockResolvedValue({
      id: "bk-1",
      status: "CONFIRMED",
      paymentStatus: "PAID",
    });

    mockTx.payment.upsert.mockResolvedValue({
      id: "pay-1",
      bookingId: "bk-1",
      stripeSessionId: "cs_123",
      stripePaymentIntentId: "pi_123",
      status: "SUCCEEDED",
      amount: 5000,
      currency: "usd",
    });

    mockTx.notification.create.mockResolvedValue({
      id: "notif-2",
      bookingId: "bk-1",
      type: "PAYMENT_RECEIVED",
      status: "PENDING",
    });

    const result = await processPaymentStateChangeWithTransaction(
      {
        bookingId: "bk-1",
        paymentStatus: "PAID",
        stripeSessionId: "cs_123",
        stripePaymentIntentId: "pi_123",
      },
      mockTx
    );

    expect(result.booking.paymentStatus).toBe("PAID");
    expect(result.booking.status).toBe("CONFIRMED");
    expect(result.payment.status).toBe("SUCCEEDED");
    expect(result.notification.type).toBe("PAYMENT_RECEIVED");
  });
});
