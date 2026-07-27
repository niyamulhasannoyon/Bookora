"use client";

import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  X,
  Filter,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface SerializedBooking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  notes?: string | null;
  startAt: string;
  endAt: string;
  status: string;
  service: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  };
}

interface DashboardCalendarViewProps {
  initialBookings: SerializedBooking[];
  googleConnected: boolean;
}

export function DashboardCalendarView({
  initialBookings,
  googleConnected,
}: DashboardCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedBooking, setSelectedBooking] = useState<SerializedBooking | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Month navigation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (statusFilter === "ALL") return initialBookings;
    return initialBookings.filter((b) => b.status === statusFilter);
  }, [initialBookings, statusFilter]);

  // Map bookings by YYYY-MM-DD string key
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, SerializedBooking[]>();
    filteredBookings.forEach((b) => {
      const d = new Date(b.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const existing = map.get(key) || [];
      existing.push(b);
      map.set(key, existing);
    });
    return map;
  }, [filteredBookings]);

  // Google Calendar Manual Sync Trigger
  const handleGoogleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMessage("Google Calendar synchronized successfully!");
      } else {
        setSyncMessage(data.error || "Sync completed with warnings.");
      }
    } catch (err) {
      setSyncMessage("Sync triggered.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // Calendar Grid Days
  const gridCells = [];
  // Empty padding cells before first day of month
  for (let i = 0; i < firstDayOfWeek; i++) {
    gridCells.push(null);
  }
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    gridCells.push(day);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Calendar Schedule
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visual month & week schedule of all customer bookings.
          </p>
        </div>

        {/* Google Calendar Sync Indicator */}
        <div className="flex items-center gap-3">
          {googleConnected ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>Google Calendar Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <AlertCircle className="h-4 w-4" />
              <span>Google Calendar Sync Pending</span>
            </div>
          )}

          <Button
            size="sm"
            disabled={isSyncing}
            onClick={handleGoogleSync}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </Button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3.5 rounded-xl bg-violet-600/10 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-violet-400" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Calendar Controls & Filters */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <h2 className="text-lg font-extrabold text-white min-w-[180px]">
              {monthName}
            </h2>
            <div className="flex items-center gap-1 border border-slate-800 bg-slate-950/80 rounded-xl p-1">
              <button
                onClick={prevMonth}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={goToToday}
                className="px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="PENDING">Pending Only</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="CANCELLED">Cancelled Only</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main Calendar Grid */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/60 text-center py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-800/60 bg-slate-950/20">
          {gridCells.map((dayNum, index) => {
            if (dayNum === null) {
              return <div key={`empty-${index}`} className="min-h-[100px] sm:min-h-[120px] bg-slate-950/40 p-2" />;
            }

            const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const dayBookings = bookingsByDate.get(dayKey) || [];

            const isToday =
              new Date().getDate() === dayNum &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <div
                key={dayKey}
                className={`min-h-[100px] sm:min-h-[120px] p-2 flex flex-col justify-between transition-colors ${
                  isToday ? "bg-violet-950/20 border-violet-500/30" : "hover:bg-slate-900/40"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                      isToday
                        ? "bg-violet-600 text-white shadow-md shadow-violet-500/30"
                        : "text-slate-300"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayBookings.length > 0 && (
                    <span className="text-[10px] font-bold text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-500/20">
                      {dayBookings.length}
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                <div className="space-y-1 overflow-y-auto max-h-[75px] scrollbar-none">
                  {dayBookings.map((b) => {
                    const timeStr = new Date(b.startAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className={`p-1 rounded-lg text-[11px] leading-tight cursor-pointer truncate transition-all ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25"
                            : b.status === "PENDING"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25"
                            : b.status === "COMPLETED"
                            ? "bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25"
                            : "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
                        }`}
                      >
                        <span className="font-semibold mr-1">{timeStr}</span>
                        <span>{b.customerName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Appointment Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Customer</span>
                <span className="font-semibold text-white">{selectedBooking.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-300 text-xs">{selectedBooking.customerEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Service</span>
                <span className="font-semibold text-violet-300">{selectedBooking.service.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Price</span>
                <span className="font-bold text-white">{formatPrice(selectedBooking.service.price)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date & Time</span>
                <span className="font-mono text-xs text-amber-300">
                  {new Date(selectedBooking.startAt).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedBooking.status === "CONFIRMED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
