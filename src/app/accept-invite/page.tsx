import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AcceptInviteView } from "@/components/accept-invite-view";

export const dynamic = "force-dynamic";

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-white">Invalid Invitation Link</h1>
          <p className="text-slate-400 text-sm">
            No invitation token was provided in the URL link. Please check your invitation link and try again.
          </p>
        </div>
      </div>
    );
  }

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      organization: true,
      invitedBy: { select: { name: true, email: true } },
    },
  });

  if (!invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-white">Invitation Not Found</h1>
          <p className="text-slate-400 text-sm">
            This invitation link is invalid or has been revoked.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = new Date() > invitation.expiresAt;
  const currentUser = await getCurrentUser();

  return (
    <AcceptInviteView
      token={token}
      organizationName={invitation.organization.name}
      organizationSlug={invitation.organization.slug}
      invitedRole={invitation.role}
      invitedBy={invitation.invitedBy.name || invitation.invitedBy.email}
      invitedEmail={invitation.email}
      isUsed={invitation.used}
      isExpired={isExpired}
      currentUser={currentUser ? { id: currentUser.id, email: currentUser.email || "" } : null}
    />
  );
}
