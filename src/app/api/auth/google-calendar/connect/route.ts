import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGoogleOAuthUrl } from "@/lib/google-calendar";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json({ error: "Missing organizationId parameter" }, { status: 400 });
  }

  // Authorize: user must be OWNER or ADMIN of the organization
  const membership = await db.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: session.user.id,
        organizationId,
      },
    },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Forbidden: Only organization owners or admins can connect Google Calendar" },
      { status: 403 }
    );
  }

  const authUrl = getGoogleOAuthUrl(organizationId);
  return NextResponse.redirect(authUrl);
}
