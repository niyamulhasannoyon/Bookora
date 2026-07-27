"use client";

import { useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Clock,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  AlertTriangle,
  Loader2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { toggleServiceActiveAction, deleteServiceAction } from "@/actions/service";

export interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  price: number; // in cents
  currency: string;
  bufferBefore: number;
  bufferAfter: number;
  isActive: boolean;
}

interface ServiceListProps {
  initialServices: ServiceItem[];
  orgSlug?: string;
  userRole?: string;
}

export function ServiceList({ initialServices, orgSlug, userRole }: ServiceListProps) {
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Optimistic UI state hook
  const [optimisticServices, setOptimisticServices] = useOptimistic(
    services,
    (state: ServiceItem[], action: { type: "TOGGLE"; id: string; isActive: boolean } | { type: "DELETE"; id: string }) => {
      if (action.type === "TOGGLE") {
        return state.map((s) => (s.id === action.id ? { ...s, isActive: action.isActive } : s));
      }
      if (action.type === "DELETE") {
        return state.filter((s) => s.id !== action.id);
      }
      return state;
    }
  );

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    setErrorNotice(null);
    const newStatus = !currentStatus;

    startTransition(async () => {
      // Apply optimistic update immediately
      setOptimisticServices({ type: "TOGGLE", id, isActive: newStatus });

      const res = await toggleServiceActiveAction(id, newStatus, orgSlug);
      if (!res.success) {
        setErrorNotice(res.error || "Failed to update service status.");
        // Revert by resetting base state trigger
        setServices([...services]);
      } else {
        setServices((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive: newStatus } : s))
        );
      }
    });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the service "${name}"?`)) {
      return;
    }

    setErrorNotice(null);
    setDeletingId(id);

    startTransition(async () => {
      setOptimisticServices({ type: "DELETE", id });

      const res = await deleteServiceAction(id, orgSlug);
      if (!res.success) {
        setErrorNotice(res.error || "Failed to delete service.");
        setServices([...services]);
      } else {
        setServices((prev) => prev.filter((s) => s.id !== id));
      }
      setDeletingId(null);
    });
  };

  // Filtered services
  const filteredServices = optimisticServices.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && s.isActive) ||
      (statusFilter === "INACTIVE" && !s.isActive);

    return matchesSearch && matchesStatus;
  });

  const newServiceHref = orgSlug ? `/${orgSlug}/services/new` : "/dashboard/services/new";

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span>Services</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
              {services.length} Total
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure offered appointment services, pricing, durations, and buffer times.
          </p>
        </div>

        <Link href={newServiceHref}>
          <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white gap-2 shadow-lg shadow-violet-600/20">
            <Plus className="h-4 w-4" />
            <span>Create New Service</span>
          </Button>
        </Link>
      </div>

      {/* Error notification banner if any action fails */}
      {errorNotice && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Action Blocked</p>
            <p className="text-red-300/90 text-xs mt-0.5">{errorNotice}</p>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-xs text-red-400 underline hover:text-red-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
          <Input
            type="text"
            placeholder="Search services by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900/80 border-slate-800 focus:border-violet-500 text-white pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === "ALL"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === "ACTIVE"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter("INACTIVE")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              statusFilter === "INACTIVE"
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <Card className="bg-slate-900/40 border border-slate-800 text-center py-16">
          <CardContent className="space-y-4">
            <div className="p-4 rounded-full bg-violet-600/10 text-violet-400 inline-block border border-violet-500/20">
              <Briefcase className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-white">No services found</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {searchQuery || statusFilter !== "ALL"
                ? "No services match your current search and filter criteria."
                : "You haven't created any services for this organization yet. Click below to add your first service."}
            </p>
            {!searchQuery && statusFilter === "ALL" && (
              <Link href={newServiceHref}>
                <Button className="mt-2 gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Service</span>
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredServices.map((s) => {
            const editHref = orgSlug
              ? `/${orgSlug}/services/${s.id}/edit`
              : `/dashboard/services/${s.id}/edit`;

            return (
              <Card
                key={s.id}
                className={`bg-slate-900/60 border transition-all flex flex-col justify-between ${
                  s.isActive
                    ? "border-slate-800 hover:border-slate-700"
                    : "border-slate-800/50 opacity-75 bg-slate-950/40"
                }`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl font-bold text-white">{s.name}</CardTitle>
                    <span className="text-lg font-extrabold text-violet-400">
                      {formatPrice(s.price, s.currency)}
                    </span>
                  </div>
                  <CardDescription className="mt-2 text-slate-400 text-sm line-clamp-2">
                    {s.description || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Meta stats */}
                  <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-violet-400" />
                      <span>
                        Duration: <strong>{s.durationMinutes} mins</strong>
                      </span>
                    </div>
                    <div className="text-slate-600">|</div>
                    <div>
                      <span>
                        Buffer: <strong>+{s.bufferBefore}m / +{s.bufferAfter}m</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleToggleActive(s.id, s.isActive)}
                      className="flex items-center gap-2 text-xs font-semibold transition-opacity hover:opacity-80"
                      title={s.isActive ? "Click to deactivate" : "Click to activate"}
                    >
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-400">
                          <XCircle className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <Link href={editHref}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          <span>Edit</span>
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s.id, s.name)}
                        disabled={deletingId === s.id}
                        className="h-8 px-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            <span>Delete</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
