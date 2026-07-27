"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, CheckCircle, AlertTriangle, Building2, UserCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvitation } from "@/actions/team";

interface AcceptInviteViewProps {
  token: string;
  organizationName: string;
  organizationSlug: string;
  invitedRole: string;
  invitedBy: string;
  invitedEmail: string;
  isUsed: boolean;
  isExpired: boolean;
  currentUser: { id: string; email: string } | null;
}

export function AcceptInviteView({
  token,
  organizationName,
  organizationSlug,
  invitedRole,
  invitedBy,
  invitedEmail,
  isUsed,
  isExpired,
  currentUser,
}: AcceptInviteViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAccept = async () => {
    if (!currentUser) {
      // Redirect to login with return back url
      router.push(`/login?callbackUrl=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await acceptInvitation(token);
    setLoading(false);

    if (res.success && res.data) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard/team`);
      }, 1500);
    } else {
      setError(res.error || "Failed to accept invitation.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="h-12 w-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-violet-400 font-bold">Team Invitation</span>
            <h1 className="text-xl font-black text-white">{organizationName}</h1>
          </div>
        </div>

        {isUsed ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <span>Invitation Already Used</span>
            </div>
            <p className="text-xs text-slate-400">
              This invitation token has already been accepted and activated.
            </p>
          </div>
        ) : isExpired ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
              <span>Invitation Expired</span>
            </div>
            <p className="text-xs text-slate-400">
              This invitation token expired. Please ask an owner or admin of {organizationName} to send a new invite.
            </p>
          </div>
        ) : success ? (
          <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Welcome to the Team!</h2>
            <p className="text-sm text-slate-300">
              You are now a staff member of <strong className="text-white">{organizationName}</strong> with role <span className="text-violet-400 font-mono">{invitedRole}</span>.
            </p>
            <p className="text-xs text-slate-400">Redirecting to team dashboard...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Invited by:</span>
                <span className="text-white font-medium">{invitedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Email:</span>
                <span className="text-white font-medium font-mono">{invitedEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Role:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold font-mono">
                  {invitedRole}
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!currentUser && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                You need to log in to your account (or create one) to accept this invitation.
              </div>
            )}

            <Button
              onClick={handleAccept}
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl gap-2 text-sm shadow-lg shadow-violet-600/20"
            >
              {loading ? (
                "Accepting Invitation..."
              ) : currentUser ? (
                <>
                  <UserCheck className="h-4 w-4" />
                  <span>Accept Invitation & Join Team</span>
                </>
              ) : (
                <>
                  <span>Sign In to Accept Invitation</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
