import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  renderBookingConfirmationEmail,
  renderPaymentReceiptEmail,
  renderCancellationEmail,
  renderRescheduleEmail,
  render24hReminderEmail,
  render1hReminderEmail,
} from "../../src/lib/email-templates";
import {
  sendBookingConfirmation,
  sendCancellationEmail,
  sendRescheduleEmail,
  sendReminderEmail,
  sendPaymentReceipt,
  resolveBookingRecipients,
} from "../../src/lib/email";
import { db } from "../../src/lib/db";

describe("Transactional Email Notification System", () => {
  const sampleParams = {
    bookingId: "booking_test_123",
    customerName: "Alice Smith",
    customerEmail: "alice@example.com",
    customerPhone: "+15550199",
    serviceName: "Full Body Massage",
    organizationName: "Zen Wellness Spa",
    startTimeFormatted: "Monday, August 10, 2026 at 2:00 PM",
    endTimeFormatted: "3:00 PM",
    priceFormatted: "$100.00",
    notes: "Please focus on shoulders",
  };

  describe("Email Templates Rendering", () => {
    it("renders Booking Confirmation template correctly", () => {
      const rendered = renderBookingConfirmationEmail(sampleParams);
      expect(rendered.subject).toContain("Booking Confirmed: Full Body Massage");
      expect(rendered.html).toContain("Alice Smith");
      expect(rendered.html).toContain("Zen Wellness Spa");
      expect(rendered.html).toContain("Monday, August 10, 2026 at 2:00 PM");
      expect(rendered.html).toContain("$100.00");
    });

    it("renders Payment Receipt template correctly", () => {
      const rendered = renderPaymentReceiptEmail({
        ...sampleParams,
        paymentAmountFormatted: "$100.00",
        transactionId: "pi_test_9999",
      });
      expect(rendered.subject).toContain("Payment Receipt from Zen Wellness Spa");
      expect(rendered.html).toContain("Payment Successful");
      expect(rendered.html).toContain("$100.00");
      expect(rendered.html).toContain("pi_test_9999");
    });

    it("renders Booking Cancellation template correctly", () => {
      const rendered = renderCancellationEmail({
        ...sampleParams,
        reason: "Customer requested cancellation",
      });
      expect(rendered.subject).toContain("Booking Cancelled: Full Body Massage");
      expect(rendered.html).toContain("Booking Cancelled ❌");
      expect(rendered.html).toContain("Customer requested cancellation");
    });

    it("renders Booking Rescheduled template correctly", () => {
      const rendered = renderRescheduleEmail({
        ...sampleParams,
        oldStartTimeFormatted: "Sunday, August 9, 2026 at 2:00 PM",
      });
      expect(rendered.subject).toContain("Booking Rescheduled: Full Body Massage");
      expect(rendered.html).toContain("Schedule Updated");
      expect(rendered.html).toContain("Sunday, August 9, 2026 at 2:00 PM");
      expect(rendered.html).toContain("Monday, August 10, 2026 at 2:00 PM");
    });

    it("renders 24-Hour Reminder template correctly", () => {
      const rendered = render24hReminderEmail(sampleParams);
      expect(rendered.subject).toContain("Reminder: Appointment Tomorrow with Zen Wellness Spa");
      expect(rendered.html).toContain("24-Hour Reminder");
      expect(rendered.html).toContain("scheduled in 24 hours");
    });

    it("renders 1-Hour Reminder template correctly", () => {
      const rendered = render1hReminderEmail(sampleParams);
      expect(rendered.subject).toContain("Starting Soon: Appointment in 1 Hour");
      expect(rendered.html).toContain("1-Hour Reminder");
      expect(rendered.html).toContain("1 hour");
    });
  });

  describe("Recipient Resolution", () => {
    it("resolves Customer, Organization Owner, and Staff recipients", async () => {
      // Mock db.booking.findUnique response
      vi.spyOn(db.booking, "findUnique").mockResolvedValueOnce({
        id: "b_1",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "+15551234",
        notes: null,
        startAt: new Date("2026-08-10T14:00:00Z"),
        endAt: new Date("2026-08-10T15:00:00Z"),
        service: { name: "Haircut", price: 5000, currency: "usd" },
        organization: {
          name: "Salon X",
          members: [
            {
              role: "OWNER",
              user: { email: "owner@salonx.com", name: "Owner Bob" },
            },
            {
              role: "MEMBER",
              user: { email: "staff@salonx.com", name: "Staff Charlie" },
            },
          ],
        },
      } as any);

      const resolved = await resolveBookingRecipients("b_1");
      expect(resolved).not.toBeNull();
      expect(resolved?.recipients).toHaveLength(3);
      expect(resolved?.recipients.map((r) => r.role)).toEqual(["customer", "owner", "staff"]);
      expect(resolved?.recipients.map((r) => r.email)).toEqual([
        "jane@example.com",
        "owner@salonx.com",
        "staff@salonx.com",
      ]);
    });
  });

  describe("Non-blocking Dispatch & Deduplication", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("dispatches booking confirmation safely and stores Notification status in mock mode", async () => {
      const mockBooking = {
        id: "b_confirm_1",
        customerName: "John Smith",
        customerEmail: "john@example.com",
        customerPhone: null,
        notes: null,
        startAt: new Date("2026-08-15T10:00:00Z"),
        endAt: new Date("2026-08-15T11:00:00Z"),
        service: { name: "Consultation", price: 0, currency: "usd" },
        organization: {
          name: "Tech Solutions",
          members: [{ role: "OWNER", user: { email: "boss@tech.com", name: "Boss" } }],
        },
      };

      vi.spyOn(db.booking, "findUnique").mockResolvedValue(mockBooking as any);
      vi.spyOn(db.notification, "findFirst").mockResolvedValue(null);
      const createSpy = vi.spyOn(db.notification, "create").mockResolvedValue({
        id: "notif_1",
        bookingId: "b_confirm_1",
        type: "BOOKING_CONFIRMATION",
        status: "PENDING",
        attempts: 0,
      } as any);

      const updateSpy = vi.spyOn(db.notification, "update").mockResolvedValue({
        id: "notif_1",
        status: "SENT",
        attempts: 1,
      } as any);

      const res = await sendBookingConfirmation("b_confirm_1");
      expect(res.success).toBe(true);
      expect(res.recipientCount).toBe(2);
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    it("prevents duplicate email dispatches when notification was already SENT", async () => {
      const mockBooking = {
        id: "b_dedup_1",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        startAt: new Date("2026-08-15T10:00:00Z"),
        endAt: new Date("2026-08-15T11:00:00Z"),
        service: { name: "Consultation", price: 0, currency: "usd" },
        organization: { name: "Tech Solutions", members: [] },
      };

      vi.spyOn(db.booking, "findUnique").mockResolvedValue(mockBooking as any);

      // Simulate existing SENT record
      vi.spyOn(db.notification, "findFirst").mockResolvedValue({
        id: "existing_notif",
        status: "SENT",
      } as any);

      const createSpy = vi.spyOn(db.notification, "create");

      const res = await sendBookingConfirmation("b_dedup_1");
      expect(res.success).toBe(true);
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("never throws an exception even if database or notification resolution fails", async () => {
      vi.spyOn(db.booking, "findUnique").mockRejectedValue(new Error("DB Connection Lost"));

      const res = await sendBookingConfirmation("b_broken");
      expect(res.success).toBe(false);
      expect(res.errors[0]).toContain("DB Connection Lost");
    });
  });

  describe("Exported Functions Checklist", () => {
    it("provides all required notification export functions", async () => {
      expect(typeof sendBookingConfirmation).toBe("function");
      expect(typeof sendCancellationEmail).toBe("function");
      expect(typeof sendRescheduleEmail).toBe("function");
      expect(typeof sendReminderEmail).toBe("function");
      expect(typeof sendPaymentReceipt).toBe("function");
    });
  });
});
