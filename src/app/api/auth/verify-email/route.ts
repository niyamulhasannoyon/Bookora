import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMITS } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  // Rate limiting: max 5 verification attempts per minute per IP
  const identifier = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, DEFAULT_RATE_LIMITS.AUTH);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Verification token is required." },
        { status: 400 }
      );
    }

    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid or expired verification token." },
        { status: 400 }
      );
    }

    if (new Date() > verificationToken.expires) {
      await db.verificationToken.delete({ where: { token } });
      return NextResponse.json(
        { error: "Verification link has expired. Please request a new verification link." },
        { status: 400 }
      );
    }

    // Find user by identifier (email)
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User associated with this token was not found." },
        { status: 404 }
      );
    }

    // Mark email as verified
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete verification token
    await db.verificationToken.delete({ where: { token } });

    return NextResponse.json({
      message: "Email address verified successfully!",
    });
  } catch (error) {
    console.error("[VERIFY_EMAIL_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to verify email address." },
      { status: 500 }
    );
  }
}
