"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, CalendarDays, ExternalLink, DollarSign } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface GlobalBookingItem {
  id: string;
  organizationName: string;
  organizationSlug: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus: string;
  price: number;
  currency: string;
  createdAt: string;
}

export function GlobalBookingsTable({
  initialBookings,
}: {
  initialBookings: GlobalBookingItem[];
}) {
  const [bookings, setBookings] = useState<GlobalBookingItem[]>(initialBookings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = bookings.filter((b) => {
    const query = search.toLowerCase();
    const matchesSearch =
      b.customerName.toLowerCase().includes(query) ||
      b.customerEmail.toLowerCase().includes(query) ||
      b.organizationName.toLowerCase().includes(query) ||
      b.serviceName.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by customer, business, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          >
            <option value="ALL">All Statuses ({bookings.length})</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PENDING">PENDING</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Appointment</th>
                <th className="py-3 px-4">Business</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>{b.serviceName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{b.id}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        href={`/book/${b.organizationSlug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 font-medium text-amber-400 hover:underline"
                      >
                        <span>{b.organizationName}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{b.customerName}</div>
                      <div className="text-[11px] text-slate-400">{b.customerEmail}</div>
                      {b.customerPhone && (
                        <div className="text-[10px] text-slate-500 font-mono">{b.customerPhone}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                      {new Date(b.startAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white">
                      {formatPrice(b.price, b.currency)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : b.status === "CANCELLED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.paymentStatus === "PAID"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {b.paymentStatus}
                      </span>
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
