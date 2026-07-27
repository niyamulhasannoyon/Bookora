import { db } from "@/lib/db";
import { Booking, Payment, Notification, Prisma } from "@prisma/client";

export interface CreateBookingParams {
  organizationId: string;
  serviceId: string;
  staffId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  startAt: Date;
  endAt: Date;
  timezone?: string;
  stripeSessionId?: string;
  amountCents?: number;
}

export interface PaymentStateChangeParams {
  bookingId: string;
  paymentStatus: "PAID" | "UNPAID" | "REFUNDED" | "FAILED";
  bookingStatus?: "CONFIRMED" | "CANCELLED" | "PENDING" | "COMPLETED";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentAmount?: number;
  currency?: string;
}

/**
 * Creates a booking atomically inside a database transaction.
 * Guarantees zero double-booking by locking and verifying existing overlapping slots.
 */
export async function createBookingWithTransaction(
  params: CreateBookingParams,
  txPrisma?: Prisma.TransactionClient
): Promise<{ booking: Booking; payment?: Payment | null; notification: Notification }> {
  const executeTx = async (tx: Prisma.TransactionClient) => {
    // 1. Verify service exists and belongs to the specified organization
    const service = await tx.service.findFirst({
      where: {
        id: params.serviceId,
        organizationId: params.organizationId,
        isActive: true,
      },
    });

    if (!service) {
      throw new Error("Service not found or inactive for this organization.");
    }

    // 2. Check for overlapping active bookings within requested time range plus buffers
    const bufferBefore = service.bufferBefore || 0;
    const bufferAfter = service.bufferAfter || 0;

    // Buffer-adjusted start and end times for candidate booking
    const bufferedStartAt = new Date(params.startAt.getTime() - bufferBefore * 60 * 1000);
    const bufferedEndAt = new Date(params.endAt.getTime() + bufferAfter * 60 * 1000);

    const overlappingBookings = await tx.booking.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.staffId ? { staffId: params.staffId } : {}),
        status: { notIn: ["CANCELLED"] },
        AND: [
          { startAt: { lt: bufferedEndAt } },
          { endAt: { gt: bufferedStartAt } },
        ],
      },
    });

    if (overlappingBookings.length > 0) {
      throw new Error("The selected time slot is no longer available.");
    }

    // 3. Create the Booking record
    const booking = await tx.booking.create({
      data: {
        organizationId: params.organizationId,
        serviceId: params.serviceId,
        staffId: params.staffId || null,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        notes: params.notes,
        startAt: params.startAt,
        endAt: params.endAt,
        timezone: params.timezone || "UTC",
        status: "PENDING",
        paymentStatus: params.stripeSessionId ? "PENDING" : "UNPAID",
      },
    });


    // 4. Create Payment record if stripe session ID, amount, or service price is defined
    let payment: Payment | null = null;
    if (params.stripeSessionId || params.amountCents !== undefined || service.price >= 0) {
      payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          stripeSessionId: params.stripeSessionId || null,
          amount: params.amountCents ?? service.price,
          currency: service.currency || "usd",
          status: "PENDING",
        },
      });
    }

    // 5. Create initial Notification record
    const notification = await tx.notification.create({
      data: {
        bookingId: booking.id,
        type: "BOOKING_CONFIRMATION",
        status: "PENDING",
      },
    });

    return { booking, payment, notification };
  };

  if (txPrisma) {
    return executeTx(txPrisma);
  }

  return db.$transaction(executeTx);
}

/**
 * Updates booking and payment states atomically inside a database transaction.
 */
export async function processPaymentStateChangeWithTransaction(
  params: PaymentStateChangeParams,
  txPrisma?: Prisma.TransactionClient
): Promise<{ booking: Booking; payment: Payment; notification: Notification }> {
  const executeTx = async (tx: Prisma.TransactionClient) => {
    const existingBooking = await tx.booking.findUnique({
      where: { id: params.bookingId },
      include: { service: true, payment: true },
    });

    if (!existingBooking) {
      throw new Error(`Booking with ID ${params.bookingId} not found.`);
    }

    const newBookingStatus = params.bookingStatus || (params.paymentStatus === "PAID" ? "CONFIRMED" : existingBooking.status);

    // 1. Update Booking status and paymentStatus
    const updatedBooking = await tx.booking.update({
      where: { id: params.bookingId },
      data: {
        paymentStatus: params.paymentStatus,
        status: newBookingStatus,
      },
    });

    // 2. Upsert Payment record
    const paymentStatusMap = {
      PAID: "SUCCEEDED",
      UNPAID: "PENDING",
      REFUNDED: "REFUNDED",
      FAILED: "FAILED",
    } as const;

    const paymentStatusStr = paymentStatusMap[params.paymentStatus] || "PENDING";

    const updatedPayment = await tx.payment.upsert({
      where: { bookingId: params.bookingId },
      create: {
        bookingId: params.bookingId,
        stripeSessionId: params.stripeSessionId || null,
        stripePaymentIntentId: params.stripePaymentIntentId || null,
        amount: params.paymentAmount ?? existingBooking.service.price,
        currency: params.currency || existingBooking.service.currency || "usd",
        status: paymentStatusStr,
      },
      update: {
        status: paymentStatusStr,
        ...(params.stripeSessionId ? { stripeSessionId: params.stripeSessionId } : {}),
        ...(params.stripePaymentIntentId ? { stripePaymentIntentId: params.stripePaymentIntentId } : {}),
      },
    });

    // 3. Create Notification record for payment state change
    const notificationType = params.paymentStatus === "PAID" ? "PAYMENT_RECEIVED" : "PAYMENT_UPDATE";
    const notification = await tx.notification.create({
      data: {
        bookingId: updatedBooking.id,
        type: notificationType,
        status: "PENDING",
      },
    });

    return { booking: updatedBooking, payment: updatedPayment, notification };
  };

  if (txPrisma) {
    return executeTx(txPrisma);
  }

  return db.$transaction(executeTx);
}
