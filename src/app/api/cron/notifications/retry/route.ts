import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sendBookingConfirmation,
  sendCancellationEmail,
  sendRescheduleEmail,
  sendReminderEmail,
  sendPaymentReceipt,
} from "@/lib/email";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    // Find all failed notifications that have fewer than 3 attempts
    const failedNotifications = await db.notification.findMany({
      where: {
        status: "FAILED",
        attempts: { lt: 3 },
      },
      take: 50,
    });

    const retriedResults = [];

    for (const notif of failedNotifications) {
      let result = { success: false, recipientCount: 0, errors: ["Unsupported type"] };

      switch (notif.type) {
        case "BOOKING_CONFIRMATION":
          result = await sendBookingConfirmation(notif.bookingId);
          break;
        case "BOOKING_CANCELLED":
          let reason: string | undefined;
          if (notif.metadata) {
            try { reason = JSON.parse(notif.metadata).reason; } catch {}
          }
          result = await sendCancellationEmail(notif.bookingId, reason);
          break;
        case "BOOKING_RESCHEDULED":
          let oldStartAt: Date | undefined;
          if (notif.metadata) {
            try {
              const parsed = JSON.parse(notif.metadata);
              if (parsed.oldStartAt) oldStartAt = new Date(parsed.oldStartAt);
            } catch {}
          }
          result = await sendRescheduleEmail(notif.bookingId, oldStartAt);
          break;
        case "REMINDER_24H":
          result = await sendReminderEmail(notif.bookingId, "24h");
          break;
        case "REMINDER_1H":
          result = await sendReminderEmail(notif.bookingId, "1h");
          break;
        case "PAYMENT_RECEIVED":
          result = await sendPaymentReceipt(notif.bookingId);
          break;
      }

      retriedResults.push({
        id: notif.id,
        type: notif.type,
        bookingId: notif.bookingId,
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      retriedCount: failedNotifications.length,
      retriedResults,
    });
  } catch (error: any) {
    console.error("[Cron Retry Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retry notification dispatches" },
      { status: 500 }
    );
  }
}
