import { Clock, Save, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const days = [
    { day: "Monday", open: "09:00", close: "17:00", isClosed: false },
    { day: "Tuesday", open: "09:00", close: "17:00", isClosed: false },
    { day: "Wednesday", open: "09:00", close: "17:00", isClosed: false },
    { day: "Thursday", open: "09:00", close: "17:00", isClosed: false },
    { day: "Friday", open: "09:00", close: "18:00", isClosed: false },
    { day: "Saturday", open: "10:00", close: "15:00", isClosed: false },
    { day: "Sunday", open: "09:00", close: "17:00", isClosed: true },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={orgSlug} />
      <div className="flex">
        <Sidebar orgSlug={orgSlug} />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Availability Schedule</h1>
              <p className="text-slate-400 text-sm mt-1">
                Define regular business operating hours when clients can book appointments.
              </p>
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              <span>Save Schedule</span>
            </Button>
          </div>

          <Card className="bg-slate-900/60 border border-slate-800 max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-400" />
                <span>Weekly Business Hours</span>
              </CardTitle>
              <CardDescription>Slots are dynamically calculated based on these operating hours.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {days.map((item) => (
                <div
                  key={item.day}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60 gap-4"
                >
                  <div className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      defaultChecked={!item.isClosed}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="font-semibold text-white text-sm">{item.day}</span>
                  </div>

                  {!item.isClosed ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="time"
                        defaultValue={item.open}
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-violet-500"
                      />
                      <span className="text-slate-500 text-xs uppercase">to</span>
                      <input
                        type="time"
                        defaultValue={item.close}
                        className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-white focus:border-violet-500"
                      />
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      Closed All Day
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
