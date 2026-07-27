import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectGoogleCalendar } from "@/lib/google-calendar";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // organizationId passed as state
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error) {
    console.error("Google OAuth error parameter:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard?calendarError=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard?calendarError=missing_params`);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/login?error=unauthorized`);
  }

  try {
    await connectGoogleCalendar({
      organizationId: state,
      userId: session.user.id,
      code,
    });

    return NextResponse.redirect(`${baseUrl}/dashboard?calendarConnected=true`);
  } catch (err: any) {
    console.error("Failed to process Google Calendar OAuth callback:", err);
    return NextResponse.redirect(
      `${baseUrl}/dashboard?calendarError=${encodeURIComponent(err.message || "Failed to connect calendar")}`
    );
  }
}
