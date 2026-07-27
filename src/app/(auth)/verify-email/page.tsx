"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const calledRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No email verification token was provided.");
      setLoading(false);
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    const verifyToken = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Email verification failed.");
        } else {
          setSuccess(data.message || "Email address verified successfully!");
        }
      } catch (err) {
        setError("An unexpected error occurred while verifying email.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[140px] pointer-events-none" />

      <Card className="w-full max-w-md border border-slate-800 bg-slate-900/80 backdrop-blur-xl relative z-10 text-center shadow-2xl p-4">
        <CardHeader>
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-4">
            {loading ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : success ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            ) : (
              <AlertCircle className="h-8 w-8 text-rose-400" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            {loading ? "Verifying Email..." : success ? "Email Verified!" : "Verification Failed"}
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm mt-1">
            {loading
              ? "Please wait while we confirm your email address."
              : success
              ? "Your email address has been verified. You can now access all features of Bookora."
              : error}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm mb-4">
              ✨ Account status updated: <strong>Verified</strong>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-center pt-2">
          {!loading && (
            <Link href={success ? "/sign-in" : "/sign-up"} className="w-full">
              <Button size="lg" className="w-full gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                <span>{success ? "Continue to Sign In" : "Back to Sign Up"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-400 text-sm">
          Loading email verification...
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
