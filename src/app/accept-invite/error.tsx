"use client";

import { useEffect } from "react";
import { RefreshCw, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AcceptInviteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Accept invite page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
        <div className="p-3 bg-red-500/10 text-red-400 rounded-full inline-block border border-red-500/20">
          <UserCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Invitation Error</h2>
        <p className="text-sm text-slate-400">
          {error.message || "Failed to process the invitation. Please try again."}
        </p>
        <Button onClick={reset} className="gap-2 bg-violet-600 hover:bg-violet-500 text-white">
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </Button>
      </div>
    </div>
  );
}
