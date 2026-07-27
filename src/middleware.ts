import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isAuthRoute =
    // Legacy redirect paths (still exist for backward compat)
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    // Modern auth routes
    nextUrl.pathname.startsWith("/sign-in") ||
    nextUrl.pathname.startsWith("/sign-up") ||
    nextUrl.pathname.startsWith("/forgot-password") ||
    nextUrl.pathname.startsWith("/reset-password") ||
    nextUrl.pathname.startsWith("/verify-email");

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");

  // Allow API auth routes unconditionally
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from login/register pages to dashboard
  if (isAuthRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  // Protected route checking:
  const isProtectedPath =
    nextUrl.pathname.startsWith("/onboarding") ||
    nextUrl.pathname.startsWith("/dashboard");

  if (isProtectedPath && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(new URL(`/sign-in?callbackUrl=${callbackUrl}`, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
