"use client";

import { useState } from "react";
import {
  Search,
  User,
  ShieldCheck,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Building2,
} from "lucide-react";
import { toggleSuperAdminStatusAction } from "@/actions/super-admin";
import { Button } from "@/components/ui/button";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  isSuperAdmin: boolean;
  emailVerified: string | null;
  createdAt: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
  }>;
}

export function UsersTable({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    const query = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(query)) ||
      u.email.toLowerCase().includes(query)
    );
  });

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setLoadingId(userId);
    try {
      const res = await toggleSuperAdminStatusAction(userId, !currentIsAdmin);
      if (res.success && res.data) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isSuperAdmin: res.data!.isSuperAdmin } : u))
        );
      } else {
        alert(res.error || "Failed to update Super Admin status.");
      }
    } catch {
      alert("Error processing admin update.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Organizations</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                          {u.name ? u.name.slice(0, 1).toUpperCase() : u.email.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{u.name || "Unnamed User"}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                          <CheckCircle className="h-3 w-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400">
                          <AlertCircle className="h-3 w-3" /> Unverified
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {u.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <ShieldAlert className="h-3 w-3" /> Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                          <User className="h-3 w-3" /> Regular User
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {u.organizations.length === 0 ? (
                          <span className="text-[11px] text-slate-500">None</span>
                        ) : (
                          u.organizations.map((org) => (
                            <span
                              key={org.id}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300"
                            >
                              <Building2 className="h-2.5 w-2.5 text-violet-400" />
                              <span>{org.name}</span>
                              <span className="text-slate-500">({org.role})</span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loadingId === u.id}
                        onClick={() => handleToggleAdmin(u.id, u.isSuperAdmin)}
                        className={`text-[11px] h-7 px-2.5 ${
                          u.isSuperAdmin
                            ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            : "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        }`}
                      >
                        {loadingId === u.id
                          ? "Saving..."
                          : u.isSuperAdmin
                          ? "Revoke Admin"
                          : "Make Super Admin"}
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
