import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReminderEmail } from "@/lib/email";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    const now = new Date();

    // 1. Find 24-hour reminder candidates: startAt between 23h and 25h from now
    const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const candidates24h = await db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        startAt: {
          gte: window24hStart,
          lte: window24hEnd,
        },
      },
      select: { id: true },
    });

    // 2. Find 1-hour reminder candidates: startAt between 50m and 70m from now
    const window1hStart = new Date(now.getTime() + 50 * 60 * 1000);
    const window1hEnd = new Date(now.getTime() + 70 * 60 * 1000);

    const candidates1h = await db.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING"] },
        startAt: {
          gte: window1hStart,
          lte: window1hEnd,
        },
      },
      select: { id: true },
    });

    const results24h = [];
    for (const b of candidates24h) {
      const res = await sendReminderEmail(b.id, "24h");
      results24h.push({ bookingId: b.id, ...res });
    }

    const results1h = [];
    for (const b of candidates1h) {
      const res = await sendReminderEmail(b.id, "1h");
      results1h.push({ bookingId: b.id, ...res });
    }

    return NextResponse.json({
      success: true,
      processed: {
        reminders24hCount: candidates24h.length,
        reminders1hCount: candidates1h.length,
      },
      results24h,
      results1h,
    });
  } catch (error: any) {
    console.error("[Cron Reminders Error]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process reminder notifications" },
      { status: 500 }
    );
  }
}
