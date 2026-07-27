import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validators";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMITS } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  // Rate limiting: max 5 password reset requests per minute per IP
  const identifier = getClientIdentifier(req);
  const rateLimitResult = checkRateLimit(identifier, DEFAULT_RATE_LIMITS.AUTH);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  try {
    const body = await req.json();
    const validated = forgotPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid email address format." },
        { status: 400 }
      );
    }

    const { email } = validated.data;
    const lowerEmail = email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email: lowerEmail },
    });

    // To prevent user enumeration, return success even if user doesn't exist
    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, we have sent a password reset link.",
      });
    }

    // Delete any previous tokens for this email
    await db.passwordResetToken.deleteMany({
      where: { email: lowerEmail },
    });

    // Create password reset token (valid for 1 hour)
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.passwordResetToken.create({
      data: {
        email: lowerEmail,
        token,
        expires,
      },
    });

    // Send password reset email
    await sendPasswordResetEmail({ email: lowerEmail, token });

    return NextResponse.json({
      message: "If an account with that email exists, we have sent a password reset link.",
    });
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to process password reset request." },
      { status: 500 }
    );
  }
}
