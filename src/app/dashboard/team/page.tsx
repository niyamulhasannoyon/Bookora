import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { getTenantDb } from "@/lib/tenant-db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { TeamView, TeamMemberRecord } from "@/components/dashboard/team-view";
import { OrganizationRole } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardTeamPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const tenantDb = getTenantDb(tenant.organizationId);
  const rawMembers = await tenantDb.members.findMany();
  const rawServices = await tenantDb.services.findMany(false);
  const rawInvitations = await tenantDb.invitations.findMany();

  const members: TeamMemberRecord[] = rawMembers.map((m: any) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name || m.user.email.split("@")[0],
    email: m.user.email,
    image: m.user.image,
    role: m.role as OrganizationRole,
    createdAt: m.createdAt.toISOString(),
    assignedServices: m.assignedServices ? m.assignedServices.map((s: any) => s.serviceId) : [],
  }));

  const services = rawServices.map((s: any) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
  }));

  const invitations = rawInvitations.map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role as OrganizationRole,
    token: inv.token,
    expiresAt: inv.expiresAt.toISOString(),
    used: inv.used,
    createdAt: inv.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={tenant.slug} />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar orgSlug={tenant.slug} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <TeamView
            orgSlug={tenant.slug}
            initialMembers={members}
            services={services}
            initialInvitations={invitations}
            currentUserRole={tenant.role}
            currentUserId={tenant.userId}
          />
        </main>
      </div>
    </div>
  );
}

