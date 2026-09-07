import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validators";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
          return null;
        }

        const isSuperAdminUser =
          Boolean(user.isSuperAdmin) ||
          (process.env.SUPER_ADMIN_EMAILS || "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
            .includes(user.email.toLowerCase());

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
          isSuperAdmin: isSuperAdminUser,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        token.emailVerified = user.emailVerified;
        token.isSuperAdmin = Boolean(user.isSuperAdmin);
      } else if (token.sub) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.sub },
            select: { email: true, emailVerified: true, isSuperAdmin: true },
          });
          if (dbUser) {
            token.emailVerified = dbUser.emailVerified;
            const isConfiguredAdmin =
              Boolean(dbUser.isSuperAdmin) ||
              (process.env.SUPER_ADMIN_EMAILS || "")
                .split(",")
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean)
                .includes(dbUser.email?.toLowerCase() || "");
            token.isSuperAdmin = isConfiguredAdmin;
          }
        } catch {
          // Ignore DB error during JWT refresh fallback
        }
      }
      return token;
    },
  },
});

/**
 * Server-side helper to retrieve the authenticated user from session.
 * Does NOT trust client-side user IDs.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

/**
 * Server-side helper that enforces authentication.
 * Redirects unauthenticated users to /login.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user || !user.id) {
    const { redirect } = await import("next/navigation");
    redirect("/sign-in");
    throw new Error("Unauthorized");
  }
  return user as typeof user & { id: string };
}

/**
 * Server-side helper that enforces organization membership.
 * Derives user ID strictly from the authenticated session.
 */
export async function requireOrganizationMember(orgIdOrSlug: string) {
  const user = await requireAuth();

  const member = await db.organizationMember.findFirst({
    where: {
      userId: user.id,
      organization: {
        OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }],
      },
    },
    include: {
      organization: true,
    },
  });

  if (!member) {
    throw new Error("Unauthorized: You are not a member of this organization.");
  }

  return { user, member, organization: member.organization };
}
