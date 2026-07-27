import {
  toZonedTime,
  fromZonedTime,
  formatInTimeZone,
} from "date-fns-tz";
import {
  addMinutes,
  addHours,
  addDays,
  format,
  parse,
  isBefore,
  isAfter,
  isEqual,
} from "date-fns";
import { db } from "@/lib/db";

export interface TimeSlot {
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "09:30"
  startAt?: Date;
  endAt?: Date;
  available: boolean;
  reason?: string;
}

export interface AvailabilityWindow {
  dayOfWeek: string;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "17:00"
  isClosed?: boolean;
}

export interface ExistingBooking {
  startTime: Date;
  endTime: Date;
}

export interface GoogleBusySlot {
  start: Date;
  end: Date;
}

export interface GenerateTimeSlotsParams {
  dateStr: string; // "YYYY-MM-DD"
  window: AvailabilityWindow;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  existingBookings?: ExistingBooking[];
  googleBusySlots?: GoogleBusySlot[];
  slotIntervalMinutes?: number;
  timezone?: string;
  now?: Date;
  minNoticeHours?: number;
  maxBookingDays?: number;
}

export interface GetAvailableSlotsParams {
  organizationId: string;
  serviceId: string;
  staffId?: string;
  date: string | Date; // "YYYY-MM-DD" or Date
  now?: Date;
  dbClient?: any;
  slotIntervalMinutes?: number;
}

/**
 * Returns the day of week name (e.g. "MONDAY") for a given date in a specific timezone.
 */
export function getDayOfWeekName(date: Date | string, timezone: string = "UTC"): string {
  const targetDate = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(targetDate, timezone, "EEEE").toUpperCase();
}

/**
 * Pure generator function to create time slots for a specific availability window.
 */
export function generateTimeSlots(params: GenerateTimeSlotsParams): TimeSlot[] {
  const {
    dateStr,
    window,
    durationMinutes,
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0,
    existingBookings = [],
    googleBusySlots = [],
    slotIntervalMinutes = durationMinutes,
    timezone = "UTC",
    now = new Date(),
    minNoticeHours = 0,
    maxBookingDays = 60,
  } = params;

  if (window.isClosed) {
    return [];
  }

  // Parse window start & end in target timezone to UTC Date objects
  const windowStartUtc = fromZonedTime(`${dateStr}T${window.startTime}:00`, timezone);
  const windowEndUtc = fromZonedTime(`${dateStr}T${window.endTime}:00`, timezone);

  const minNoticeTime = addHours(now, minNoticeHours);
  const maxBookingTime = addDays(now, maxBookingDays);

  const slots: TimeSlot[] = [];
  let currentSlotStart = windowStartUtc;

  while (true) {
    const slotEnd = addMinutes(currentSlotStart, durationMinutes);

    // Stop if slot exceeds window end time
    if (isAfter(slotEnd, windowEndUtc)) {
      break;
    }

    // Include buffers for collision detection
    const bufferedSlotStart = addMinutes(currentSlotStart, -bufferBeforeMinutes);
    const bufferedSlotEnd = addMinutes(slotEnd, bufferAfterMinutes);

    let available = true;
    let reason: string | undefined = undefined;

    // Notice & booking window checks
    if (isBefore(currentSlotStart, minNoticeTime)) {
      available = false;
      reason = "MIN_NOTICE";
    } else if (isAfter(currentSlotStart, maxBookingTime)) {
      available = false;
      reason = "MAX_WINDOW_EXCEEDED";
    }

    // Check collision with existing bookings
    if (available) {
      for (const booking of existingBookings) {
        // Overlap: candidate buffered window overlaps with existing booking
        if (
          isBefore(bufferedSlotStart, booking.endTime) &&
          isAfter(bufferedSlotEnd, booking.startTime)
        ) {
          available = false;
          reason = "BOOKED";
          break;
        }
      }
    }

    // Check collision with Google Calendar busy slots
    if (available) {
      for (const busy of googleBusySlots) {
        if (
          isBefore(bufferedSlotStart, busy.end) &&
          isAfter(bufferedSlotEnd, busy.start)
        ) {
          available = false;
          reason = "BUSY_EXTERNAL";
          break;
        }
      }
    }

    slots.push({
      startTime: formatInTimeZone(currentSlotStart, timezone, "HH:mm"),
      endTime: formatInTimeZone(slotEnd, timezone, "HH:mm"),
      startAt: currentSlotStart,
      endAt: slotEnd,
      available,
      ...(reason ? { reason } : {}),
    });

    // Advance to next slot interval
    currentSlotStart = addMinutes(currentSlotStart, slotIntervalMinutes);
  }

  return slots;
}

/**
 * Production-grade availability engine implementation.
 * Loads organization timezone, service specs, weekly availability, date overrides, and existing bookings.
 */
export async function getAvailableSlots(params: GetAvailableSlotsParams): Promise<TimeSlot[]> {
  const prisma = params.dbClient || db;
  const now = params.now || new Date();

  // 1. Load organization & timezone
  const org = await prisma.organization.findUnique({
    where: { id: params.organizationId },
  });

  if (!org) {
    throw new Error(`Organization with ID '${params.organizationId}' not found.`);
  }

  const timezone = org.timezone || "UTC";

  // 2. Load service duration & buffer settings
  const service = await prisma.service.findFirst({
    where: {
      id: params.serviceId,
      organizationId: params.organizationId,
      isActive: true,
    },
  });

  if (!service) {
    throw new Error(`Service with ID '${params.serviceId}' not found or inactive.`);
  }

  // Determine normalized dateStr ("YYYY-MM-DD") in org timezone
  let dateStr: string;
  if (typeof params.date === "string") {
    dateStr = params.date;
  } else {
    dateStr = formatInTimeZone(params.date, timezone, "yyyy-MM-dd");
  }

  const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, timezone);
  const dayEndUtc = fromZonedTime(`${dateStr}T23:59:59.999`, timezone);
  const dayOfWeek = formatInTimeZone(dayStartUtc, timezone, "EEEE").toUpperCase();

  let windows: AvailabilityWindow[] = [];

  // If staffId is specified, check staff availability first
  if (params.staffId) {
    const staffOverrides = prisma.staffAvailabilityOverride ? await prisma.staffAvailabilityOverride.findMany({
      where: {
        organizationId: params.organizationId,
        memberId: params.staffId,
        date: {
          gte: dayStartUtc,
          lte: dayEndUtc,
        },
      },
    }) : [];

    if (staffOverrides.length > 0) {
      const isClosedOverride = staffOverrides.some(
        (o: any) => !o.isAvailable || (!o.startTime && !o.endTime)
      );

      if (isClosedOverride) {
        return [];
      }

      windows = staffOverrides
        .filter((o: any) => o.isAvailable && o.startTime && o.endTime)
        .map((o: any) => ({
          dayOfWeek,
          startTime: o.startTime!,
          endTime: o.endTime!,
          isClosed: false,
        }));
    } else {
      const staffWeekly = prisma.staffAvailability ? await prisma.staffAvailability.findMany({
        where: {
          organizationId: params.organizationId,
          memberId: params.staffId,
          dayOfWeek,
        },
      }) : [];

      if (staffWeekly.length > 0) {
        const isDayClosed = staffWeekly.some((a: any) => a.isClosed);
        if (isDayClosed) {
          return [];
        }

        windows = staffWeekly
          .filter((a: any) => !a.isClosed && a.startTime && a.endTime)
          .map((a: any) => ({
            dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            isClosed: false,
          }));
      }
    }
  }

  // Fallback to Org-wide availability if no staff specific windows were found
  if (windows.length === 0) {
    // 3. Load date overrides (custom date windows, vacation/holiday blocking)
    const overrides = await prisma.availabilityOverride.findMany({
      where: {
        organizationId: params.organizationId,
        date: {
          gte: dayStartUtc,
          lte: dayEndUtc,
        },
      },
    });

    if (overrides.length > 0) {
      // Check if day is blocked/closed via overrides
      const isClosedOverride = overrides.some(
        (o: any) => !o.isAvailable || (!o.startTime && !o.endTime)
      );

      if (isClosedOverride) {
        return [];
      }

      windows = overrides
        .filter((o: any) => o.isAvailable && o.startTime && o.endTime)
        .map((o: any) => ({
          dayOfWeek,
          startTime: o.startTime!,
          endTime: o.endTime!,
          isClosed: false,
        }));
    } else {
      // 4. Load weekly recurring availability for dayOfWeek
      const weeklyAvailabilities = await prisma.availability.findMany({
        where: {
          organizationId: params.organizationId,
          dayOfWeek,
        },
      });

      const isDayClosed = weeklyAvailabilities.some((a: any) => a.isClosed);
      if (isDayClosed || weeklyAvailabilities.length === 0) {
        return [];
      }

      windows = weeklyAvailabilities
        .filter((a: any) => !a.isClosed && a.startTime && a.endTime)
        .map((a: any) => ({
          dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          isClosed: false,
        }));
    }
  }

  if (windows.length === 0) {
    return [];
  }

  // 5. Load existing confirmed/pending bookings (filter by staffId if specified)
  const queryBufferMarginMinutes = Math.max(service.bufferBefore, service.bufferAfter, 60);
  const searchStartUtc = addMinutes(dayStartUtc, -queryBufferMarginMinutes);
  const searchEndUtc = addMinutes(dayEndUtc, queryBufferMarginMinutes);

  const existingBookingsRecords = await prisma.booking.findMany({
    where: {
      organizationId: params.organizationId,
      ...(params.staffId ? { staffId: params.staffId } : {}),
      status: { notIn: ["CANCELLED"] },
      AND: [
        { startAt: { lt: searchEndUtc } },
        { endAt: { gt: searchStartUtc } },
      ],
    },
  });


  const existingBookings: ExistingBooking[] = existingBookingsRecords.map((b: any) => ({
    startTime: b.startAt,
    endTime: b.endAt,
  }));

  // 6-10. Generate slots across all windows and return
  const slotIntervalMinutes = params.slotIntervalMinutes || service.durationMinutes;
  const allSlots: TimeSlot[] = [];

  for (const window of windows) {
    const windowSlots = generateTimeSlots({
      dateStr,
      window,
      durationMinutes: service.durationMinutes,
      bufferBeforeMinutes: service.bufferBefore,
      bufferAfterMinutes: service.bufferAfter,
      existingBookings,
      slotIntervalMinutes,
      timezone,
      now,
      minNoticeHours: service.minNoticeHours ?? 0,
      maxBookingDays: service.maxBookingDays ?? 60,
    });

    allSlots.push(...windowSlots);
  }

  return allSlots;
}
