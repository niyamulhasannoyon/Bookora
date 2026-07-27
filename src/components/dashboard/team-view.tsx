"use client";

import { useState } from "react";
import {
  UserCheck,
  Plus,
  Mail,
  Shield,
  User,
  Sparkles,
  CheckCircle,
  X,
  Trash2,
  Copy,
  Clock,
  Briefcase,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DayOfWeek, OrganizationRole, TeamMemberRecord } from "@/types";
import {
  inviteTeamMember,
  removeTeamMember,
  changeMemberRole,
  assignStaffServices,
  updateStaffAvailability,
} from "@/actions/team";

export type { TeamMemberRecord };

export interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
}

export interface InvitationItem {
  id: string;
  email: string;
  role: OrganizationRole;
  token: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

interface TeamViewProps {
  orgSlug: string;
  initialMembers: TeamMemberRecord[];
  services: ServiceOption[];
  initialInvitations?: InvitationItem[];
  currentUserRole: OrganizationRole;
  currentUserId?: string;
}

const DAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function TeamView({
  orgSlug,
  initialMembers,
  services,
  initialInvitations = [],
  currentUserRole,
  currentUserId,
}: TeamViewProps) {
  const [members, setMembers] = useState<TeamMemberRecord[]>(initialMembers);
  const [invitations, setInvitations] = useState<InvitationItem[]>(initialInvitations);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("STAFF");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Assign Services Modal State
  const [selectedMemberForServices, setSelectedMemberForServices] = useState<TeamMemberRecord | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [assignServicesLoading, setAssignServicesLoading] = useState(false);

  // Staff Availability Modal State
  const [selectedMemberForAvailability, setSelectedMemberForAvailability] = useState<TeamMemberRecord | null>(null);
  const [staffAvailabilities, setStaffAvailabilities] = useState<
    Array<{ dayOfWeek: DayOfWeek; startTime: string; endTime: string; isClosed: boolean }>
  >(
    DAYS.map((day) => ({
      dayOfWeek: day,
      startTime: "09:00",
      endTime: "17:00",
      isClosed: day === "SATURDAY" || day === "SUNDAY",
    }))
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const canManageMembers = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    setActionError(null);

    const res = await inviteTeamMember({
      orgIdOrSlug: orgSlug,
      email: inviteEmail,
      role: inviteRole,
    });

    setInviteLoading(false);

    if (res.success && res.data) {
      setGeneratedLink(res.data.invitationLink);
      setInvitations((prev) => [
        {
          id: res.data!.id,
          email: res.data!.email,
          role: res.data!.role,
          token: res.data!.token,
          expiresAt: res.data!.expiresAt,
          used: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setActionSuccess(`Invitation generated for ${inviteEmail} as ${inviteRole}`);
      setInviteEmail("");
    } else {
      setActionError(res.error || "Failed to send invitation.");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: OrganizationRole) => {
    setActionError(null);
    setActionSuccess(null);

    const res = await changeMemberRole({
      orgIdOrSlug: orgSlug,
      memberId,
      newRole,
    });

    if (res.success && res.data) {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: res.data!.role } : m))
      );
      setActionSuccess(`Updated role to ${newRole}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      setActionError(res.error || "Failed to change role.");
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this organization?`)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    const res = await removeTeamMember({
      orgIdOrSlug: orgSlug,
      memberId,
    });

    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      setActionSuccess(`Removed ${name} from organization`);
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      setActionError(res.error || "Failed to remove member.");
    }
  };

  const openAssignServicesModal = (member: TeamMemberRecord) => {
    setSelectedMemberForServices(member);
    setSelectedServiceIds(member.assignedServices || []);
  };

  const handleSaveAssignedServices = async () => {
    if (!selectedMemberForServices) return;

    setAssignServicesLoading(true);
    setActionError(null);

    const res = await assignStaffServices({
      orgIdOrSlug: orgSlug,
      memberId: selectedMemberForServices.id,
      serviceIds: selectedServiceIds,
    });

    setAssignServicesLoading(false);

    if (res.success) {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMemberForServices.id
            ? { ...m, assignedServices: selectedServiceIds }
            : m
        )
      );
      setActionSuccess(`Assigned services updated for ${selectedMemberForServices.name}`);
      setSelectedMemberForServices(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      setActionError(res.error || "Failed to assign services.");
    }
  };

  const handleSaveStaffAvailability = async () => {
    if (!selectedMemberForAvailability) return;

    setAvailabilityLoading(true);
    setActionError(null);

    const res = await updateStaffAvailability({
      orgIdOrSlug: orgSlug,
      memberId: selectedMemberForAvailability.id,
      availabilities: staffAvailabilities,
    });

    setAvailabilityLoading(false);

    if (res.success) {
      setActionSuccess(`Working hours updated for ${selectedMemberForAvailability.name}`);
      setSelectedMemberForAvailability(null);
      setTimeout(() => setActionSuccess(null), 3000);
    } else {
      setActionError(res.error || "Failed to update staff availability.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Team & Staff Management
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage organization staff members, assign security roles, services, and working hours.
          </p>
        </div>

        {canManageMembers && (
          <Button
            onClick={() => {
              setGeneratedLink(null);
              setInviteModalOpen(true);
            }}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5 shadow-lg shadow-violet-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Invite Team Member</span>
          </Button>
        )}
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Team Members List */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-400" />
            Active Team Members ({members.length})
          </CardTitle>
          <CardDescription>
            Members who have access to manage bookings, availability, and services for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="pb-3">Member</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Assigned Services</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-4 font-medium text-white flex items-center gap-3">
                      {m.image ? (
                        <img
                          src={m.image}
                          alt={m.name}
                          className="h-9 w-9 rounded-full object-cover border border-violet-500/30"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {m.name}
                          {m.userId === currentUserId && (
                            <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-mono">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{m.email}</div>
                      </div>
                    </td>

                    <td className="py-4">
                      {canManageMembers ? (
                        <select
                          value={m.role}
                          onChange={(e) =>
                            handleRoleChange(m.id, e.target.value as OrganizationRole)
                          }
                          className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500 font-mono font-bold"
                        >
                          <option value="OWNER">OWNER</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="STAFF">STAFF</option>
                        </select>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                            m.role === "OWNER"
                              ? "bg-violet-500/10 text-violet-300 border border-violet-500/30"
                              : m.role === "ADMIN"
                              ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
                              : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>

                    <td className="py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {m.assignedServices && m.assignedServices.length > 0 ? (
                          m.assignedServices.map((sId) => {
                            const s = services.find((serv) => serv.id === sId);
                            return (
                              <span
                                key={sId}
                                className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[11px]"
                              >
                                {s ? s.name : sId}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-500 italic">All Services</span>
                        )}

                        {canManageMembers && (
                          <button
                            onClick={() => openAssignServicesModal(m)}
                            className="p-1 hover:bg-slate-800 text-violet-400 rounded-md text-xs flex items-center gap-1"
                            title="Assign Services"
                          >
                            <Briefcase className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-4 text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMemberForAvailability(m)}
                        className="text-xs border-slate-800 hover:bg-slate-800 text-slate-300 gap-1"
                      >
                        <Clock className="h-3.5 w-3.5 text-violet-400" />
                        <span>Availability</span>
                      </Button>

                      {canManageMembers && m.role !== "OWNER" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveMember(m.id, m.name)}
                          className="text-xs border-rose-500/20 text-rose-400 hover:bg-rose-500/10 gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Active Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="bg-slate-900/40 border border-slate-800/80 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-violet-400" />
              Pending Secure Invitations ({invitations.filter((i) => !i.used).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs gap-2"
                >
                  <div>
                    <span className="font-mono font-bold text-white">{inv.email}</span>
                    <span className="ml-2 text-slate-400">Role: <strong className="text-violet-300">{inv.role}</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-mono">
                    <span>{inv.used ? "Accepted" : new Date() > new Date(inv.expiresAt) ? "Expired" : "Active"}</span>
                    {!inv.used && new Date() <= new Date(inv.expiresAt) && (
                      <button
                        onClick={() => {
                          const baseUrl = window.location.origin;
                          navigator.clipboard.writeText(`${baseUrl}/accept-invite?token=${inv.token}`);
                          setActionSuccess(`Copied invite link for ${inv.email}`);
                          setTimeout(() => setActionSuccess(null), 3000);
                        }}
                        className="text-violet-400 hover:underline flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        Copy Link
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Teammate Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                Invite New Teammate
              </h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {generatedLink ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-2">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4" />
                    Secure Invitation Token Created!
                  </div>
                  <p className="text-slate-300">
                    Share this one-time expiring link with your new team member:
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="bg-transparent text-xs text-violet-300 font-mono w-full focus:outline-none"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      setActionSuccess("Invitation link copied!");
                      setTimeout(() => setActionSuccess(null), 3000);
                    }}
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setInviteModalOpen(false)} className="bg-slate-800 text-white text-xs">
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teammate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@business.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Assign Organization Role *
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono text-xs"
                  >
                    <option value="STAFF">STAFF (Manage assigned bookings & set working hours)</option>
                    <option value="ADMIN">ADMIN (Full management access except ownership)</option>
                    <option value="OWNER">OWNER (Full control & organization ownership)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <Button variant="outline" type="button" onClick={() => setInviteModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteLoading}
                    className="bg-violet-600 hover:bg-violet-500 text-white"
                  >
                    {inviteLoading ? "Generating..." : "Generate Invite Token"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Assign Services Modal */}
      {selectedMemberForServices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-400" />
                Assign Services ({selectedMemberForServices.name})
              </h3>
              <button
                onClick={() => setSelectedMemberForServices(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select which services {selectedMemberForServices.name} is qualified to perform:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {services.map((service) => {
                const checked = selectedServiceIds.includes(service.id);
                return (
                  <label
                    key={service.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-violet-500/50"
                  >
                    <div>
                      <div className="text-sm font-bold text-white">{service.name}</div>
                      <div className="text-xs text-slate-400">{service.durationMinutes} min</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedServiceIds((prev) => [...prev, service.id]);
                        } else {
                          setSelectedServiceIds((prev) => prev.filter((id) => id !== service.id));
                        }
                      }}
                      className="h-4 w-4 rounded accent-violet-600"
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setSelectedMemberForServices(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveAssignedServices}
                disabled={assignServicesLoading}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {assignServicesLoading ? "Saving..." : "Save Assigned Services"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Availability Modal */}
      {selectedMemberForAvailability && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-400" />
                Staff Working Hours ({selectedMemberForAvailability.name})
              </h3>
              <button
                onClick={() => setSelectedMemberForAvailability(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Configure weekly availability schedule for customer appointments:
            </p>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {staffAvailabilities.map((avail, idx) => (
                <div
                  key={avail.dayOfWeek}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <span className="font-mono font-bold text-white w-24">{avail.dayOfWeek.slice(0, 3)}</span>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avail.isClosed}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setStaffAvailabilities((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, isClosed: val } : item))
                        );
                      }}
                      className="accent-rose-500"
                    />
                    <span className="text-slate-400">Off</span>
                  </label>

                  {!avail.isClosed ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={avail.startTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStaffAvailabilities((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, startTime: val } : item))
                          );
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="time"
                        value={avail.endTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStaffAvailabilities((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, endTime: val } : item))
                          );
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white focus:outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Not Available</span>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setSelectedMemberForAvailability(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveStaffAvailability}
                disabled={availabilityLoading}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {availabilityLoading ? "Saving..." : "Save Working Hours"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
