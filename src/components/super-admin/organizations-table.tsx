"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  ExternalLink,
  Ban,
  CheckCircle,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  toggleOrganizationSuspensionAction,
  updateOrganizationPlanAction,
} from "@/actions/super-admin";
import { PlanTier } from "@/lib/plans";
import { Button } from "@/components/ui/button";

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  isSuspended: boolean;
  currentPeriodEnd: string | null;
  createdAt: string;
  membersCount: number;
  servicesCount: number;
  bookingsCount: number;
}

export function OrganizationsTable({
  initialOrganizations,
}: {
  initialOrganizations: OrganizationItem[];
}) {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>(initialOrganizations);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase());
    const matchesPlan =
      planFilter === "ALL" || org.subscriptionPlan.toUpperCase() === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleToggleSuspend = async (orgId: string, currentSuspended: boolean) => {
    setLoadingId(orgId);
    try {
      const res = await toggleOrganizationSuspensionAction(orgId, !currentSuspended);
      if (res.success && res.data) {
        setOrganizations((prev) =>
          prev.map((o) => (o.id === orgId ? { ...o, isSuspended: res.data!.isSuspended } : o))
        );
      } else {
        alert(res.error || "Failed to update suspension status.");
      }
    } catch {
      alert("Error processing request.");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePlanChange = async (orgId: string, newPlan: PlanTier) => {
    setLoadingId(orgId);
    try {
      const res = await updateOrganizationPlanAction(orgId, newPlan);
      if (res.success && res.data) {
        setOrganizations((prev) =>
          prev.map((o) =>
            o.id === orgId ? { ...o, subscriptionPlan: res.data!.subscriptionPlan } : o
          )
        );
      } else {
        alert(res.error || "Failed to update plan tier.");
      }
    } catch {
      alert("Error processing plan change.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search organizations by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Filter Plan:</label>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="ALL">All Tiers ({organizations.length})</option>
            <option value="FREE">Free Starter</option>
            <option value="PRO">Pro Tier</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4 text-center">Members</th>
                <th className="py-3 px-4 text-center">Services</th>
                <th className="py-3 px-4 text-center">Bookings</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No organizations match the search criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400">
                          {org.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{org.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">/{org.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Subscription Plan Switcher */}
                    <td className="py-3.5 px-4">
                      <select
                        value={org.subscriptionPlan}
                        disabled={loadingId === org.id}
                        onChange={(e) => handlePlanChange(org.id, e.target.value as PlanTier)}
                        className={`text-xs font-bold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none ${
                          org.subscriptionPlan === "ENTERPRISE"
                            ? "bg-purple-950/60 border-purple-500/40 text-purple-300"
                            : org.subscriptionPlan === "PRO"
                            ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                            : "bg-slate-800/80 border-slate-700 text-slate-300"
                        }`}
                      >
                        <option value="FREE">FREE</option>
                        <option value="PRO">PRO</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {org.membersCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-300">
                      {org.servicesCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                      {org.bookingsCount}
                    </td>

                    <td className="py-3.5 px-4">
                      {org.isSuspended ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <Ban className="h-3 w-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="h-3 w-3" /> Active
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        href={`/book/${org.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-[11px]"
                      >
                        <ExternalLink className="h-3 w-3" /> Storefront
                      </Link>

                      <Button
                        size="sm"
                        variant={org.isSuspended ? "default" : "outline"}
                        disabled={loadingId === org.id}
                        onClick={() => handleToggleSuspend(org.id, org.isSuspended)}
                        className={`text-[11px] h-7 px-2.5 ${
                          org.isSuspended
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                        }`}
                      >
                        {loadingId === org.id
                          ? "Saving..."
                          : org.isSuspended
                          ? "Reactivate"
                          : "Suspend"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
