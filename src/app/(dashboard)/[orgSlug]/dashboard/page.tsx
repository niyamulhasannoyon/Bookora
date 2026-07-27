import Link from "next/link";
import {
  CalendarDays,
  DollarSign,
  Briefcase,
  Users,
  Clock,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  // Mock metrics for dashboard
  const metrics = [
    { title: "Total Bookings", value: "48", icon: CalendarDays, change: "+12% this month" },
    { title: "Total Revenue", value: "$3,450.00", icon: DollarSign, change: "+18% this month" },
    { title: "Active Services", value: "4", icon: Briefcase, change: "2 new added" },
    { title: "Customers Served", value: "39", icon: Users, change: "95% satisfaction" },
  ];

  const upcomingBookings = [
    {
      id: "b1",
      customer: "Sarah Jenkins",
      service: "Signature Hair Styling & Cut",
      date: "Today at 2:00 PM",
      amount: 8500,
      status: "CONFIRMED",
    },
    {
      id: "b2",
      customer: "Michael Scott",
      service: "Beard Trim & Facial Treatment",
      date: "Tomorrow at 10:30 AM",
      amount: 4500,
      status: "CONFIRMED",
    },
    {
      id: "b3",
      customer: "Elena Rostova",
      service: "Coloring & Scalp Therapy",
      date: "Jul 29 at 3:00 PM",
      amount: 14000,
      status: "PENDING",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={orgSlug} />
      <div className="flex">
        <Sidebar orgSlug={orgSlug} />
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold capitalize text-white">
                {orgSlug.replace(/-/g, " ")} Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Overview of appointments, revenue metrics, and booking activity.
              </p>
            </div>
            <Link href={`/${orgSlug}`} target="_blank">
              <Button className="gap-2">
                <span>View Public Booking Page</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.title} className="bg-slate-900/60 border border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{m.title}</span>
                    <div className="p-2 rounded-lg bg-violet-600/10 text-violet-400 border border-violet-500/20">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold text-white">{m.value}</div>
                  <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>{m.change}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Upcoming Bookings Table */}
          <Card className="bg-slate-900/60 border border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
                <CardDescription>Recent customer reservations scheduled for your business.</CardDescription>
              </div>
              <Link href={`/${orgSlug}/bookings`}>
                <Button variant="outline" size="sm">View All</Button>
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
                    {upcomingBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40">
                        <td className="py-4 font-medium text-white">{b.customer}</td>
                        <td className="py-4 text-slate-300">{b.service}</td>
                        <td className="py-4 text-slate-400">{b.date}</td>
                        <td className="py-4 text-violet-300 font-semibold">{formatPrice(b.amount)}</td>
                        <td className="py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              b.status === "CONFIRMED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
