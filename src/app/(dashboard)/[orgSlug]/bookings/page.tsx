import { Calendar, Search, Filter, Mail, Phone, MoreHorizontal, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export default async function BookingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const bookings = [
    {
      id: "b1",
      customerName: "Sarah Jenkins",
      customerEmail: "sarah.j@example.com",
      customerPhone: "+1 (555) 234-5678",
      serviceName: "Signature Haircut & Styling",
      startTime: "Today at 2:00 PM",
      price: 6500,
      status: "CONFIRMED",
      notes: "Prefers organic shampoo if available.",
    },
    {
      id: "b2",
      customerName: "Michael Scott",
      customerEmail: "m.scott@dundermifflin.com",
      customerPhone: "+1 (555) 876-5432",
      serviceName: "Beard Trim & Hot Towel Treatment",
      startTime: "Tomorrow at 10:30 AM",
      price: 3500,
      status: "CONFIRMED",
      notes: "",
    },
    {
      id: "b3",
      customerName: "Elena Rostova",
      customerEmail: "elena@example.com",
      customerPhone: "+1 (555) 345-6789",
      serviceName: "Full Service Hair & Scalp Therapy",
      startTime: "Jul 29 at 3:00 PM",
      price: 12000,
      status: "PENDING",
      notes: "First time customer.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={orgSlug} />
      <div className="flex">
        <Sidebar orgSlug={orgSlug} />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Bookings & Appointments</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage, reschedule, or review all incoming appointment reservations.
              </p>
            </div>
          </div>

          <Card className="bg-slate-900/60 border border-slate-800">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search customer name, email..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-4 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter Status</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 rounded-2xl border border-slate-800/80 bg-slate-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-base">{b.customerName}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <p className="text-violet-300 font-medium text-sm">{b.serviceName}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-violet-400" />
                          {b.startTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {b.customerEmail}
                        </span>
                        {b.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {b.customerPhone}
                          </span>
                        )}
                      </div>

                      {b.notes && (
                        <p className="text-xs text-slate-400 italic pt-1">
                          "{b.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      <span className="text-lg font-bold text-white">{formatPrice(b.price)}</span>
                      <Button variant="outline" size="sm">Reschedule</Button>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">Cancel</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
