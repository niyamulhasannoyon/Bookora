import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import {
  CalendarDays,
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ArrowUpRight,
  Plus,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage() {
  const tenant = await getCurrentOrganization();

  if (!tenant) {
    redirect("/onboarding");
  }

  const { organizationId, slug } = tenant;

  // 1. Calculate Date Ranges
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // 2. Fetch Tenant Isolated Metrics
  const [
    todayCount,
    upcomingCount,
    totalCount,
    completedCount,
    cancelledCount,
    paidPayments,
    allBookings,
  ] = await Promise.all([
    // Today's Bookings
    db.booking.count({
      where: {
        organizationId,
        startAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
    // Upcoming Bookings
    db.booking.count({
      where: {
        organizationId,
        startAt: { gte: now },
        status: { not: "CANCELLED" },
      },
    }),
    // Total Bookings
    db.booking.count({
      where: { organizationId },
    }),
    // Completed Bookings
    db.booking.count({
      where: { organizationId, status: "COMPLETED" },
    }),
    // Cancelled Bookings
    db.booking.count({
      where: { organizationId, status: "CANCELLED" },
    }),
    // Revenue sum from payments
    db.payment.aggregate({
      where: {
        booking: { organizationId },
        status: "SUCCEEDED",
      },
      _sum: { amount: true },
    }),
    // Recent Bookings list with service and payment details
    db.booking.findMany({
      where: { organizationId },
      include: {
        service: true,
        payment: true,
      },
      orderBy: { startAt: "desc" },
      take: 20,
    }),
  ]);

  const totalRevenueInCents = paidPayments._sum.amount || 0;

  // 3. Extract Recent Customers (unique by email)
  const customerMap = new Map<string, { name: string; email: string; phone?: string | null; count: number; lastDate: Date }>();
  allBookings.forEach((b) => {
    const existing = customerMap.get(b.customerEmail);
    if (!existing) {
      customerMap.set(b.customerEmail, {
        name: b.customerName,
        email: b.customerEmail,
        phone: b.customerPhone,
        count: 1,
        lastDate: b.startAt,
      });
    } else {
      existing.count += 1;
      if (b.startAt > existing.lastDate) {
        existing.lastDate = b.startAt;
      }
    }
  });

  const recentCustomers = Array.from(customerMap.values()).slice(0, 5);

  // Today's & Upcoming appointments for quick schedule
  const todayAppointments = allBookings.filter(
    (b) => new Date(b.startAt) >= startOfToday && new Date(b.startAt) <= endOfToday
  );
  const upcomingAppointments = allBookings
    .filter((b) => new Date(b.startAt) > now && b.status !== "CANCELLED")
    .slice(0, 6);

  const metrics = [
    {
      title: "Today's Bookings",
      value: todayCount.toString(),
      icon: Clock,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      subtext: "Scheduled for today",
    },
    {
      title: "Upcoming Bookings",
      value: upcomingCount.toString(),
      icon: CalendarDays,
      color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
      subtext: "Future reservations",
    },
    {
      title: "Total Bookings",
      value: totalCount.toString(),
      icon: Sparkles,
      color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
      subtext: "All time bookings",
    },
    {
      title: "Completed",
      value: completedCount.toString(),
      icon: CheckCircle2,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      subtext: "Successfully served",
    },
    {
      title: "Cancelled",
      value: cancelledCount.toString(),
      icon: XCircle,
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      subtext: "Cancelled appointments",
    },
    {
      title: "Total Revenue",
      value: formatPrice(totalRevenueInCents),
      icon: DollarSign,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      subtext: "Processed via payments",
    },
    {
      title: "Recent Customers",
      value: customerMap.size.toString(),
      icon: Users,
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      subtext: "Unique client directory",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={slug} />
      <div className="flex">
        <div className="hidden lg:block">
          <Sidebar orgSlug={slug} />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold capitalize text-white tracking-tight">
                Dashboard Overview
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Real-time booking metrics, upcoming appointments, and financial performance.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/${slug}`} target="_blank">
                <Button variant="outline" className="gap-2 border-slate-800 hover:bg-slate-900">
                  <span>Public Booking Link</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard/bookings">
                <Button className="gap-2 bg-violet-600 hover:bg-violet-500 text-white">
                  <Plus className="h-4 w-4" />
                  <span>Manage Bookings</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Overview Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.title} className="bg-slate-900/60 border border-slate-800 shadow-lg hover:border-slate-700 transition-all">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {m.title}
                      </span>
                      <div className={`p-2 rounded-xl border ${m.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {m.value}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                      <span>{m.subtext}</span>
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Two-Column Grid: Today's Appointments & Upcoming Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today & Upcoming Bookings (2 Cols) */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Clock className="h-5 w-5 text-violet-400" />
                      Today's Appointments ({todayAppointments.length})
                    </CardTitle>
                    <CardDescription>
                      Appointments scheduled for {now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
                    </CardDescription>
                  </div>
                  <Link href="/dashboard/bookings">
                    <Button variant="ghost" size="sm" className="text-xs text-violet-400 hover:text-violet-300">
                      View All Bookings <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {todayAppointments.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                      <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 font-medium text-sm">No appointments scheduled for today.</p>
                      <p className="text-slate-500 text-xs mt-1">Check upcoming bookings for future dates.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todayAppointments.map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition-colors gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-sm">{b.customerName}</span>
                              <span className="text-xs text-slate-400">({b.customerEmail})</span>
                            </div>
                            <p className="text-xs text-violet-300 mt-0.5">{b.service.name}</p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <span className="text-xs font-mono font-medium text-slate-300">
                              {new Date(b.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Bookings Table */}
              <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-indigo-400" />
                      Upcoming Bookings
                    </CardTitle>
                    <CardDescription>Scheduled customer reservations for upcoming dates.</CardDescription>
                  </div>
                  <Link href="/dashboard/bookings">
                    <Button variant="outline" size="sm" className="text-xs border-slate-800">
                      View All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                        <tr>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Service</th>
                          <th className="pb-3">Date & Time</th>
                          <th className="pb-3">Price</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {upcomingAppointments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                              No upcoming bookings scheduled.
                            </td>
                          </tr>
                        ) : (
                          upcomingAppointments.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3.5 font-medium text-white">
                                {b.customerName}
                                <div className="text-xs text-slate-400">{b.customerEmail}</div>
                              </td>
                              <td className="py-3.5 text-slate-300">{b.service.name}</td>
                              <td className="py-3.5 text-slate-400 text-xs font-mono">
                                {new Date(b.startAt).toLocaleDateString([], { month: "short", day: "numeric" })} {" "}
                                {new Date(b.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="py-3.5 text-violet-300 font-semibold">
                                {formatPrice(b.service.price)}
                              </td>
                              <td className="py-3.5">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    b.status === "CONFIRMED"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : b.status === "PENDING"
                                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                      : "bg-slate-800 text-slate-300"
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Column: Recent Customers Directory */}
            <div className="space-y-6">
              <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="h-5 w-5 text-cyan-400" />
                      Recent Customers
                    </CardTitle>
                    <Link href="/dashboard/customers">
                      <Button variant="ghost" size="sm" className="text-xs text-cyan-400 hover:text-cyan-300">
                        View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                  <CardDescription>Recently active clients in your business.</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentCustomers.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No customer records found.</p>
                  ) : (
                    <div className="space-y-4">
                      {recentCustomers.map((c) => (
                        <div
                          key={c.email}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900/80 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white text-sm truncate">{c.name}</p>
                            <p className="text-xs text-slate-400 truncate">{c.email}</p>
                          </div>
                          <div className="text-right ml-3">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20">
                              {c.count} {c.count === 1 ? "booking" : "bookings"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="bg-gradient-to-br from-violet-950/40 to-indigo-950/40 border border-violet-500/30 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-violet-200 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  <Link href="/dashboard/services" className="block">
                    <Button variant="outline" className="w-full justify-start border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-200 text-xs gap-2">
                      <Plus className="h-4 w-4 text-violet-400" />
                      <span>Add New Service</span>
                    </Button>
                  </Link>
                  <Link href="/dashboard/availability" className="block">
                    <Button variant="outline" className="w-full justify-start border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-200 text-xs gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      <span>Update Weekly Availability</span>
                    </Button>
                  </Link>
                  <Link href="/dashboard/calendar" className="block">
                    <Button variant="outline" className="w-full justify-start border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-200 text-xs gap-2">
                      <CalendarDays className="h-4 w-4 text-indigo-400" />
                      <span>View Full Calendar</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
