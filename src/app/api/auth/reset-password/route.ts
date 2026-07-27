import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/validators";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMITS } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  // Rate limiting: max 5 password reset attempts per minute per IP
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
    const validated = resetPasswordSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid password format or mismatched passwords." },
        { status: 400 }
      );
    }

    const { password, token } = validated.data;

    // Find the token in the database
    const resetToken = await db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired password reset token." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > resetToken.expires) {
      await db.passwordResetToken.delete({ where: { token } });
      return NextResponse.json(
        { error: "Password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await db.user.update({
      where: { email: resetToken.email },
      data: { password: hashedPassword },
    });

    // Delete token after successful reset
    await db.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({
      message: "Your password has been successfully reset. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to reset password." },
      { status: 500 }
    );
  }
}
