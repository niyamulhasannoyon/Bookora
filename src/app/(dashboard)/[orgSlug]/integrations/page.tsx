import { Calendar, CreditCard, CheckCircle2, Shield, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={orgSlug} />
      <div className="flex">
        <Sidebar orgSlug={orgSlug} />
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-white">Integrations & External APIs</h1>
            <p className="text-slate-400 text-sm mt-1">
              Connect external services to synchronize your calendar and process customer payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Calendar Integration */}
            <Card className="bg-slate-900/60 border border-slate-800">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-blue-400" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                </div>
                <CardTitle className="text-xl mt-4">Google Calendar</CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Automatically block busy times from your calendar and write new customer bookings directly to Google Calendar.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white">Synced Account:</p>
                  <p className="text-slate-400 mt-0.5">primary-calendar@bookora.com</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Sync Now</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Payment Integration */}
            <Card className="bg-slate-900/60 border border-slate-800">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-violet-400" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected (Test Mode)
                  </span>
                </div>
                <CardTitle className="text-xl mt-4">Stripe Payments</CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Accept major credit cards, Apple Pay, and Google Pay for service bookings.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white">Stripe Account ID:</p>
                  <p className="text-slate-400 font-mono mt-0.5">acct_1M2K8x3L9Pq0</p>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button variant="outline" size="sm">Configure Webhooks</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
