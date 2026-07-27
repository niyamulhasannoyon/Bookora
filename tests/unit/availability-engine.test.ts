import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTimeSlots,
  getAvailableSlots,
  getDayOfWeekName,
  AvailabilityWindow,
} from "@/lib/availability-engine";

describe("Production-Grade Availability Engine", () => {
  const defaultWindow: AvailabilityWindow = {
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "12:00",
    isClosed: false,
  };

  describe("1. Basic & Multi-Window Slot Generation", () => {
    it("should generate 30-minute slots between 09:00 and 12:00", () => {
      const slots = generateTimeSlots({
        dateStr: "2026-08-03",
        window: defaultWindow,
        durationMinutes: 30,
        slotIntervalMinutes: 30,
        now: new Date("2026-08-01T00:00:00Z"),
      });

      expect(slots.length).toBe(6);
      expect(slots[0].startTime).toBe("09:00");
      expect(slots[0].endTime).toBe("09:30");
      expect(slots[0].available).toBe(true);

      expect(slots[5].startTime).toBe("11:30");
      expect(slots[5].endTime).toBe("12:00");
      expect(slots[5].available).toBe(true);
    });

    it("should support multiple availability windows on the same day", async () => {
      const mockPrisma = {
        organization: {
          findUnique: vi.fn().mockResolvedValue({ id: "org-1", timezone: "America/New_York" }),
        },
        service: {
          findFirst: vi.fn().mockResolvedValue({
            id: "svc-1",
            organizationId: "org-1",
            durationMinutes: 30,
            bufferBefore: 0,
            bufferAfter: 0,
            minNoticeHours: 0,
            maxBookingDays: 60,
            isActive: true,
          }),
        },
        availabilityOverride: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        availability: {
          findMany: vi.fn().mockResolvedValue([
            { id: "a1", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "12:00", isClosed: false },
            { id: "a2", dayOfWeek: "MONDAY", startTime: "13:00", endTime: "17:00", isClosed: false },
          ]),
        },
        booking: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const slots = await getAvailableSlots({
        organizationId: "org-1",
        serviceId: "svc-1",
        date: "2026-08-03", // Monday
        now: new Date("2026-08-01T00:00:00Z"),
        dbClient: mockPrisma,
      });

      // Morning window: 09:00 - 12:00 (6 slots)
      // Afternoon window: 13:00 - 17:00 (8 slots)
      expect(slots.length).toBe(14);
      expect(slots[0].startTime).toBe("09:00");
      expect(slots[5].endTime).toBe("12:00");
      expect(slots[6].startTime).toBe("13:00");
      expect(slots[13].endTime).toBe("17:00");

      // Verify no slots exist during 12:00 - 13:00 lunch break
      const lunchSlots = slots.filter((s) => s.startTime >= "12:00" && s.startTime < "13:00");
      expect(lunchSlots).toEqual([]);
    });
  });

  describe("2. Overlapping & Adjacent Bookings", () => {
    it("should mark slots as unavailable when overlapping with existing booking", () => {
      const existingBookings = [
        {
          startTime: new Date("2026-08-03T10:00:00Z"),
          endTime: new Date("2026-08-03T11:00:00Z"),
        },
      ];

      const slots = generateTimeSlots({
        dateStr: "2026-08-03",
        window: defaultWindow,
        durationMinutes: 30,
        existingBookings,
        now: new Date("2026-08-01T00:00:00Z"),
      });

      const unavailableStartTimes = slots.filter((s) => !s.available).map((s) => s.startTime);
      expect(unavailableStartTimes).toEqual(["10:00", "10:30"]);
    });

    it("should allow adjacent bookings without buffer time", () => {
      const existingBookings = [
        {
          startTime: new Date("2026-08-03T10:00:00Z"),
          endTime: new Date("2026-08-03T10:30:00Z"),
        },
      ];

      const slots = generateTimeSlots({
        dateStr: "2026-08-03",
        window: defaultWindow,
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        existingBookings,
        now: new Date("2026-08-01T00:00:00Z"),
      });

      // 09:30 - 10:00 is directly adjacent before -> available
      // 10:30 - 11:00 is directly adjacent after -> available
      const slot930 = slots.find((s) => s.startTime === "09:30");
      const slot1000 = slots.find((s) => s.startTime === "10:00");
      const slot1030 = slots.find((s) => s.startTime === "10:30");

      expect(slot930?.available).toBe(true);
      expect(slot1000?.available).toBe(false); // occupied by 10:00-10:30
      expect(slot1030?.available).toBe(true);
    });

    it("should exclude adjacent slots when buffer time is applied", () => {
      const existingBookings = [
        {
          startTime: new Date("2026-08-03T10:00:00Z"),
          endTime: new Date("2026-08-03T10:30:00Z"),
        },
      ];

      // With 15 minutes bufferAfter, candidate 09:30 slot (09:30-10:00 + 15m buffer = 10:15) overlaps 10:00 booking!
      const slots = generateTimeSlots({
        dateStr: "2026-08-03",
        window: defaultWindow,
        durationMinutes: 30,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 15,
        existingBookings,
        now: new Date("2026-08-01T00:00:00Z"),
      });

      const slot930 = slots.find((s) => s.startTime === "09:30");
      expect(slot930?.available).toBe(false);
      expect(slot930?.reason).toBe("BOOKED");
    });
  });

  describe("3. Closed Dates & Custom Date Overrides / Vacation Blocking", () => {
    it("should return empty array if weekly day is marked closed", async () => {
      const mockPrisma = {
        organization: {
          findUnique: vi.fn().mockResolvedValue({ id: "org-1", timezone: "UTC" }),
        },
        service: {
          findFirst: vi.fn().mockResolvedValue({
            id: "svc-1",
            durationMinutes: 30,
            bufferBefore: 0,
            bufferAfter: 0,
            isActive: true,
          }),
        },
        availabilityOverride: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        availability: {
          findMany: vi.fn().mockResolvedValue([
            { id: "a1", dayOfWeek: "WEDNESDAY", startTime: "09:00", endTime: "17:00", isClosed: true },
          ]),
        },
        booking: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const slots = await getAvailableSlots({
        organizationId: "org-1",
        serviceId: "svc-1",
        date: "2026-08-05", // Wednesday
        now: new Date("2026-08-01T00:00:00Z"),
        dbClient: mockPrisma,
      });

      expect(slots).toEqual([]);
    });

    it("should apply vacation / holiday date override blocking", async () => {
      const mockPrisma = {
        organization: {
          findUnique: vi.fn().mockResolvedValue({ id: "org-1", timezone: "UTC" }),
        },
        service: {
          findFirst: vi.fn().mockResolvedValue({
            id: "svc-1",
            durationMinutes: 30,
            bufferBefore: 0,
            bufferAfter: 0,
            isActive: true,
          }),
        },
        availabilityOverride: {
          // Vacation override: explicit block for 2026-08-03
          findMany: vi.fn().mockResolvedValue([
            { id: "ov-1", date: new Date("2026-08-03"), isAvailable: false, startTime: null, endTime: null },
          ]),
        },
        availability: {
          findMany: vi.fn().mockResolvedValue([
            { id: "a1", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "17:00", isClosed: false },
          ]),
        },
        booking: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const slots = await getAvailableSlots({
        organizationId: "org-1",
        serviceId: "svc-1",
        date: "2026-08-03", // Monday, normally open, but blocked by override
        now: new Date("2026-08-01T00:00:00Z"),
        dbClient: mockPrisma,
      });

      expect(slots).toEqual([]);
    });

    it("should use custom date override availability windows when available", async () => {
      const mockPrisma = {
        organization: {
          findUnique: vi.fn().mockResolvedValue({ id: "org-1", timezone: "UTC" }),
        },
        service: {
          findFirst: vi.fn().mockResolvedValue({
            id: "svc-1",
            durationMinutes: 60,
            bufferBefore: 0,
            bufferAfter: 0,
            isActive: true,
          }),
        },
        availabilityOverride: {
          // Special custom hours on 2026-08-03: 10:00 to 14:00
          findMany: vi.fn().mockResolvedValue([
            { id: "ov-1", date: new Date("2026-08-03"), isAvailable: true, startTime: "10:00", endTime: "14:00" },
          ]),
        },
        availability: {
          findMany: vi.fn().mockResolvedValue([
            { id: "a1", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "17:00", isClosed: false },
          ]),
        },
        booking: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      const slots = await getAvailableSlots({
        organizationId: "org-1",
        serviceId: "svc-1",
        date: "2026-08-03",
        now: new Date("2026-08-01T00:00:00Z"),
        dbClient: mockPrisma,
      });

      expect(slots.length).toBe(4);
      expect(slots[0].startTime).toBe("10:00");
      expect(slots[3].endTime).toBe("14:00");
    });
  });

  describe("4. Timezone Conversion & Organization Timezone Support", () => {
    it("should format slots in organization's local timezone (e.g., Tokyo vs New York)", async () => {
      const mockPrismaNY = {
        organization: {
          findUnique: vi.fn().mockResolvedValue({ id: "org-ny", timezone: "America/New_York" }),
        },
        service: {
          findFirst: vi.fn().mockResolvedValue({
            id: "svc-1",
            durationMinutes: 60,
            isActive: true,
          }),
        },
        availabilityOverride: { findMany: vi.fn().mockResolvedValue([]) },
        availability: {
          findMany: vi.fn().mockResolvedValue([
            { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "11:00", isClosed: false },
          ]),
        },
        booking: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const slotsNY = await getAvailableSlots({
        organizationId: "org-ny",
        serviceId: "svc-1",
        date: "2026-08-03", // EDT is UTC-4
        now: new Date("2026-08-01T00:00:00Z"),
        dbClient: mockPrismaNY,
      });

      expect(slotsNY.length).toBe(2);
      expect(slotsNY[0].startTime).toBe("09:00");
      expect(slotsNY[0].endTime).toBe("10:00");
      // 09:00 EDT on Aug 3 2026 = 13:00 UTC
      expect(slotsNY[0].startAt?.toISOString()).toBe("2026-08-03T13:00:00.000Z");
      expect(slotsNY[0].endAt?.toISOString()).toBe("2026-08-03T14:00:00.000Z");
    });

    it("should handle Asia/Tokyo timezone correctly (UTC+9)", async () => {
      const mockPrismaTokyo = {
        organization: {
          findUnique: vi.fn().mockResolvedValue({ id: "org-tokyo", timezone: "Asia/Tokyo" }),
        },
        service: {
          findFirst: vi.fn().mockResolvedValue({
            id: "svc-1",
            durationMinutes: 60,
            isActive: true,
          }),
        },
        availabilityOverride: { findMany: vi.fn().mockResolvedValue([]) },
        availability: {
          findMany: vi.fn().mockResolvedValue([
            { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "11:00", isClosed: false },
          ]),
        },
        booking: { findMany: vi.fn().mockResolvedValue([]) },
      };

      const slotsTokyo = await getAvailableSlots({
        organizationId: "org-tokyo",
        serviceId: "svc-1",
        date: "2026-08-03",
        now: new Date("2026-08-01T00:00:00Z"),
        dbClient: mockPrismaTokyo,
      });

      expect(slotsTokyo[0].startTime).toBe("09:00");
      // 09:00 JST on Aug 3 2026 = 00:00 UTC
      expect(slotsTokyo[0].startAt?.toISOString()).toBe("2026-08-03T00:00:00.000Z");
    });
  });

  describe("5. Daylight Saving Transitions (DST)", () => {
    it("should handle Spring Forward transition in America/New_York (EST -> EDT)", () => {
      // US Spring forward on March 8, 2026.
      // Standard Time (EST = UTC-5) on March 7.
      // Daylight Time (EDT = UTC-4) on March 9.
      const slotsEst = generateTimeSlots({
        dateStr: "2026-03-07",
        window: defaultWindow,
        durationMinutes: 60,
        timezone: "America/New_York",
        now: new Date("2026-03-01T00:00:00Z"),
      });

      const slotsEdt = generateTimeSlots({
        dateStr: "2026-03-09",
        window: defaultWindow,
        durationMinutes: 60,
        timezone: "America/New_York",
        now: new Date("2026-03-01T00:00:00Z"),
      });

      // Both preserve wall-clock "09:00" start time in New York
      expect(slotsEst[0].startTime).toBe("09:00");
      expect(slotsEdt[0].startTime).toBe("09:00");

      // EST (UTC-5): 09:00 local = 14:00 UTC
      expect(slotsEst[0].startAt?.toISOString()).toBe("2026-03-07T14:00:00.000Z");

      // EDT (UTC-4): 09:00 local = 13:00 UTC
      expect(slotsEdt[0].startAt?.toISOString()).toBe("2026-03-09T13:00:00.000Z");
    });
  });

  describe("6. Minimum Booking Notice & Maximum Booking Window", () => {
    it("should mark slots as unavailable if they fall within minimum notice hours", () => {
      // Current time is 2026-08-03T08:00:00 in America/New_York (12:00 UTC)
      const now = new Date("2026-08-03T12:00:00Z");

      const slots = generateTimeSlots({
        dateStr: "2026-08-03",
        window: defaultWindow, // 09:00 - 12:00
        durationMinutes: 30,
        minNoticeHours: 2, // Must book at least 2 hours in advance (from 08:00 local, slots before 10:00 local are invalid)
        timezone: "America/New_York",
        now,
      });

      const slot900 = slots.find((s) => s.startTime === "09:00");
      const slot930 = slots.find((s) => s.startTime === "09:30");
      const slot1000 = slots.find((s) => s.startTime === "10:00");

      expect(slot900?.available).toBe(false);
      expect(slot900?.reason).toBe("MIN_NOTICE");

      expect(slot930?.available).toBe(false);
      expect(slot930?.reason).toBe("MIN_NOTICE");

      expect(slot1000?.available).toBe(true);
    });

    it("should mark slots as unavailable if they exceed maximum booking days", () => {
      const now = new Date("2026-08-01T00:00:00Z");

      const slots = generateTimeSlots({
        dateStr: "2026-09-15", // 45 days in future
        window: defaultWindow,
        durationMinutes: 30,
        maxBookingDays: 30, // Limit booking to 30 days max
        timezone: "UTC",
        now,
      });

      expect(slots.every((s) => !s.available && s.reason === "MAX_WINDOW_EXCEEDED")).toBe(true);
    });
  });
});
