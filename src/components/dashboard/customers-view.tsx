"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Search,
  ArrowUpDown,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export interface CustomerRecord {
  email: string;
  name: string;
  phone?: string | null;
  totalBookings: number;
  totalSpentInCents: number;
  lastBookingDate: string;
  bookings: Array<{
    id: string;
    serviceName: string;
    startAt: string;
    status: string;
    price: number;
  }>;
}

interface CustomersViewProps {
  initialCustomers: CustomerRecord[];
}

export function CustomersView({ initialCustomers }: CustomersViewProps) {
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"spend-desc" | "bookings-desc" | "name-asc" | "recent-desc">("recent-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === "spend-desc") {
          return b.totalSpentInCents - a.totalSpentInCents;
        }
        if (sortBy === "bookings-desc") {
          return b.totalBookings - a.totalBookings;
        }
        if (sortBy === "name-asc") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "recent-desc") {
          return new Date(b.lastBookingDate).getTime() - new Date(a.lastBookingDate).getTime();
        }
        return 0;
      });
  }, [customers, searchQuery, sortBy]);

  // Pagination Math
  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Customer Directory & CRM
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Directory of client profiles, lifetime appointment history, and revenue contributions.
        </p>
      </div>

      {/* Toolbar: Search & Sort */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <ArrowUpDown className="h-4 w-4 text-violet-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
            >
              <option value="recent-desc">Sort by: Most Recent</option>
              <option value="spend-desc">Sort by: Highest Lifetime Spend</option>
              <option value="bookings-desc">Sort by: Most Bookings</option>
              <option value="name-asc">Sort by: Name (A-Z)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Customer Directory Table */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/40 border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Contact Info</th>
                <th className="py-3.5 px-4">Total Bookings</th>
                <th className="py-3.5 px-4">Total Spent</th>
                <th className="py-3.5 px-4">Last Booking Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No customers found.</p>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr
                    key={c.email}
                    onClick={() => setSelectedCustomer(c)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 font-bold text-white group-hover:text-violet-300 transition-colors">
                      {c.name}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-300">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-slate-500">{c.phone}</div>}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-200">
                      <span className="inline-flex items-center gap-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 px-2.5 py-0.5 rounded-full text-xs">
                        {c.totalBookings} {c.totalBookings === 1 ? "booking" : "bookings"}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-400">
                      {formatPrice(c.totalSpentInCents)}
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-slate-400">
                      {new Date(c.lastBookingDate).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedCustomer(c)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4 mr-1" /> View History
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-950/40 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing {filteredCustomers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="h-8 border-slate-800 text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <span className="font-semibold text-white px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="h-8 border-slate-800 text-xs"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Appointments</span>
                <p className="text-xl font-black text-white mt-1">{selectedCustomer.totalBookings}</p>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">Lifetime Spend</span>
                <p className="text-xl font-black text-emerald-400 mt-1">{formatPrice(selectedCustomer.totalSpentInCents)}</p>
              </div>
            </div>

            {/* Appointment History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Appointment History ({selectedCustomer.bookings.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedCustomer.bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white block">{b.serviceName}</span>
                      <span className="text-slate-400">
                        {new Date(b.startAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-violet-300">{formatPrice(b.price)}</div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
