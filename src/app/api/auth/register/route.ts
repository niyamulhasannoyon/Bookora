import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIdentifier, DEFAULT_RATE_LIMITS } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  // Rate limiting: max 5 registration attempts per minute per IP
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
    const validated = registerSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid form input", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, organizationName } = validated.data;
    const lowerEmail = email.toLowerCase();

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in DB
    const user = await db.user.create({
      data: {
        name,
        email: lowerEmail,
        password: hashedPassword,
      },
    });

    // Create organization if organizationName was provided
    if (organizationName) {
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const existingOrg = await db.organization.findUnique({ where: { slug } });
      const finalSlug = existingOrg ? `${slug}-${Date.now().toString().slice(-4)}` : slug;

      const organization = await db.organization.create({
        data: {
          name: organizationName,
          slug: finalSlug,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
        },
      });
    }

    // Create verification token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.verificationToken.create({
      data: {
        identifier: lowerEmail,
        token,
        expires,
      },
    });

    // Send verification email
    await sendVerificationEmail({ email: lowerEmail, token });

    return NextResponse.json(
      {
        message: "Account created successfully! Please check your email to verify your account.",
        userId: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
