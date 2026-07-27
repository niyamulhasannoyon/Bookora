import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required." }, { status: 400 });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
            timezone: true,
            logo: true,
          },
        },
        service: {
          select: {
            name: true,
            description: true,
            durationMinutes: true,
            price: true,
            currency: true,
          },
        },
        payment: {
          select: {
            status: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        notes: booking.notes,
        startAt: booking.startAt,
        endAt: booking.endAt,
        timezone: booking.timezone,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        createdAt: booking.createdAt,
        organization: booking.organization,
        service: booking.service,
        payment: booking.payment,
      },
    });
  } catch (error: any) {
    console.error("Fetch booking status error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch booking details." },
      { status: 500 }
    );
  }
}
