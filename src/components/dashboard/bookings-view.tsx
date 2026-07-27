"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ArrowUpDown,
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CreditCard,
  User,
  Mail,
  Phone,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { updateBookingStatusAction } from "@/actions/booking";
import { BookingStatus } from "@/types";

interface SerializedBooking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  notes?: string | null;
  startAt: string;
  endAt: string;
  status: string;
  paymentStatus: string;
  service: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  };
  payment?: {
    amount: number;
    status: string;
  } | null;
}

interface BookingsViewProps {
  initialBookings: SerializedBooking[];
}

export function BookingsView({ initialBookings }: BookingsViewProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<SerializedBooking[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name-asc" | "price-desc" | "price-asc">("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Status counters
  const counts = useMemo(() => {
    return {
      ALL: bookings.length,
      PENDING: bookings.filter((b) => b.status === "PENDING").length,
      CONFIRMED: bookings.filter((b) => b.status === "CONFIRMED").length,
      COMPLETED: bookings.filter((b) => b.status === "COMPLETED").length,
      CANCELLED: bookings.filter((b) => b.status === "CANCELLED").length,
    };
  }, [bookings]);

  // Filtered & Sorted Bookings
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        // Status filter
        if (activeTab !== "ALL" && b.status !== activeTab) {
          return false;
        }

        // Search query (Name, Email, Service Name)
        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          const matchName = b.customerName.toLowerCase().includes(q);
          const matchEmail = b.customerEmail.toLowerCase().includes(q);
          const matchService = b.service.name.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchService) return false;
        }

        // Date range filter
        const startDate = new Date(b.startAt);
        if (fromDate) {
          const from = new Date(fromDate);
          from.setHours(0, 0, 0, 0);
          if (startDate < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (startDate > to) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
        }
        if (sortBy === "date-asc") {
          return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        }
        if (sortBy === "name-asc") {
          return a.customerName.localeCompare(b.customerName);
        }
        if (sortBy === "price-desc") {
          return b.service.price - a.service.price;
        }
        if (sortBy === "price-asc") {
          return a.service.price - b.service.price;
        }
        return 0;
      });
  }, [bookings, activeTab, searchQuery, fromDate, toDate, sortBy]);

  // Pagination Math
  const totalPages = Math.ceil(filteredBookings.length / pageSize) || 1;
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);

  // Handle status update
  const handleStatusUpdate = async (id: string, newStatus: BookingStatus) => {
    setUpdatingId(id);
    const res = await updateBookingStatusAction(id, newStatus);
    setUpdatingId(null);
    if (res.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      router.refresh();
    } else {
      alert(res.error || "Failed to update status");
    }
  };

  const statusTabs = [
    { id: "ALL", label: "All Bookings", count: counts.ALL },
    { id: "PENDING", label: "Pending", count: counts.PENDING, color: "text-amber-400" },
    { id: "CONFIRMED", label: "Confirmed", count: counts.CONFIRMED, color: "text-emerald-400" },
    { id: "COMPLETED", label: "Completed", count: counts.COMPLETED, color: "text-blue-400" },
    { id: "CANCELLED", label: "Cancelled", count: counts.CANCELLED, color: "text-rose-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Status Tabs */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Bookings Directory
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Search, filter, track, and update all customer reservations.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                  isActive
                    ? "bg-violet-600/20 text-white border-violet-500/40 shadow-inner"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive ? "bg-violet-500/30 text-violet-200" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search, Date Range, Sorting */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
        <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, or service..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40"
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

          {/* Date Range & Sorting Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* From Date */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500 font-medium">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <span className="text-slate-500 font-medium">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-white focus:outline-none text-xs"
              />
            </div>

            {/* Clear Filters Button if any active */}
            {(fromDate || toDate || searchQuery || activeTab !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setSearchQuery("");
                  setActiveTab("ALL");
                  setCurrentPage(1);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Reset
              </Button>
            )}

            {/* Sort Select */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
              <ArrowUpDown className="h-3.5 w-3.5 text-violet-400 mr-1" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white focus:outline-none text-xs cursor-pointer"
              >
                <option value="date-desc" className="bg-slate-900 text-white">Date: Newest First</option>
                <option value="date-asc" className="bg-slate-900 text-white">Date: Oldest First</option>
                <option value="name-asc" className="bg-slate-900 text-white">Customer: A-Z</option>
                <option value="price-desc" className="bg-slate-900 text-white">Price: High to Low</option>
                <option value="price-asc" className="bg-slate-900 text-white">Price: Low to High</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table Card */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/40 border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Service</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Price & Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CalendarDays className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-slate-300">No bookings match your criteria.</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const isUpdating = updatingId === b.id;
                  const bookingDate = new Date(b.startAt);

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedBooking(b)}
                    >
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="font-bold text-white group-hover:text-violet-300 transition-colors">
                          {b.customerName}
                        </div>
                        <div className="text-xs text-slate-400">{b.customerEmail}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-200 font-medium block">{b.service.name}</span>
                        <span className="text-xs text-slate-400">{b.service.durationMinutes} min</span>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono">
                        <div className="text-slate-200 font-semibold">
                          {bookingDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="text-slate-400">
                          {bookingDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-violet-300">
                          {formatPrice(b.service.price)}
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            b.paymentStatus === "PAID" ? "text-emerald-400" : "text-slate-400"
                          }`}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : b.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : b.status === "CANCELLED"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {b.status === "PENDING" && (
                            <Button
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(b.id, "CONFIRMED")}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-2.5"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Confirm
                            </Button>
                          )}
                          {b.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(b.id, "COMPLETED")}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 px-2.5"
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
                            </Button>
                          )}
                          {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isUpdating}
                              onClick={() => handleStatusUpdate(b.id, "CANCELLED")}
                              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs h-8 px-2"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedBooking(b)}
                            className="text-slate-400 hover:text-white text-xs h-8 px-2"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="bg-slate-950/40 border-t border-slate-800 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing {filteredBookings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, filteredBookings.length)} of {filteredBookings.length} bookings</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-white px-2 py-1 focus:outline-none"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
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

      {/* Booking Details Modal / Drawer */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Booking Details</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {selectedBooking.id}</p>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Customer Details
                </div>
                <div className="flex items-center gap-2 text-sm text-white font-semibold">
                  <User className="h-4 w-4 text-violet-400" />
                  {selectedBooking.customerName}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Mail className="h-3.5 w-3.5 text-slate-500" />
                  {selectedBooking.customerEmail}
                </div>
                {selectedBooking.customerPhone && (
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    {selectedBooking.customerPhone}
                  </div>
                )}
              </div>

              {/* Service & Time Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Service</span>
                  <p className="font-bold text-white text-sm mt-1">{selectedBooking.service.name}</p>
                  <p className="text-xs text-violet-300 mt-0.5">{formatPrice(selectedBooking.service.price)}</p>
                </div>
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Duration</span>
                  <p className="font-bold text-white text-sm mt-1">{selectedBooking.service.durationMinutes} minutes</p>
                  <p className="text-xs text-slate-400 mt-0.5">Status: {selectedBooking.status}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span>
                    {new Date(selectedBooking.startAt).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedBooking.paymentStatus}
                </span>
              </div>

              {/* Customer Notes */}
              {selectedBooking.notes && (
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-indigo-400" /> Customer Notes
                  </span>
                  <p className="text-xs text-slate-300 italic">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setSelectedBooking(null)} className="border-slate-800">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
