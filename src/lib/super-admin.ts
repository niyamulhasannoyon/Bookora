import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Parses configured super admin emails from the environment
 */
export function getSuperAdminEmails(): string[] {
  const envEmails = process.env.SUPER_ADMIN_EMAILS || "";
  return envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Determines if a given user object or email has Super Admin privileges
 */
export function isUserSuperAdmin(user?: {
  id?: string;
  email?: string | null;
  isSuperAdmin?: boolean;
} | null): boolean {
  if (!user) return false;

  // Check database field
  if (user.isSuperAdmin) return true;

  // Check configured email list
  if (user.email) {
    const adminEmails = getSuperAdminEmails();
    if (adminEmails.includes(user.email.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Server-side guard to strictly enforce Super Admin access.
 * If user is not authenticated or not a super admin, redirects or throws.
 */
export async function requireSuperAdmin() {
  const sessionUser = await getCurrentUser();

  if (!sessionUser || !sessionUser.id) {
    redirect("/sign-in?callbackUrl=/super-admin");
    throw new Error("Unauthorized: Authentication required.");
  }

  // Fetch fresh user record to ensure permissions haven't been revoked
  const dbUser = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      isSuperAdmin: true,
      createdAt: true,
    },
  });

  if (!dbUser || !isUserSuperAdmin(dbUser)) {
    redirect("/dashboard");
    throw new Error("Forbidden: Super Admin access required.");
  }

  return dbUser;
}
