import Link from "next/link";
import {
  Building2,
  Users,
  CalendarDays,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Server,
  Zap,
} from "lucide-react";
import { getPlatformOverviewStatsAction } from "@/actions/super-admin";
import { formatPrice } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SuperAdminOverviewPage() {
  const result = await getPlatformOverviewStatsAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl">
        <p className="text-rose-400 font-medium">Failed to load platform stats: {result.error}</p>
      </div>
    );
  }

  const {
    totalOrganizations,
    totalUsers,
    totalBookings,
    totalPlatformGmvCents,
    subscriptionBreakdown,
    recentOrganizations,
    recentBookings,
    systemHealth,
  } = result.data;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Platform Master Control</h1>
        <p className="text-slate-400 text-sm mt-1">
          High-level operational overview of all multi-tenant businesses, users, subscriptions, and system health.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Businesses
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{totalOrganizations}</div>
            <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{subscriptionBreakdown.pro} Pro</span>
              <span>•</span>
              <span className="text-purple-400 font-semibold">{subscriptionBreakdown.enterprise} Enterprise</span>
              <span>•</span>
              <span>{subscriptionBreakdown.free} Free</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Registered Users
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{totalUsers}</div>
            <p className="text-[11px] text-slate-400 mt-2">Platform-wide tenant owners & team members</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Bookings
              </span>
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-violet-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-white mt-3">{totalBookings}</div>
            <p className="text-[11px] text-slate-400 mt-2">Appointments created across all tenants</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Platform Volume (GMV)
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400 mt-3">
              {formatPrice(totalPlatformGmvCents)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Gross processed booking payment volume</p>
          </CardContent>
        </Card>
      </div>

      {/* System Infrastructure Health Diagnostics */}
      <Card className="bg-slate-900/40 border border-slate-800 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-amber-400" />
            Infrastructure & Integration Health
          </CardTitle>
          <CardDescription>Live diagnostic status of third-party platform providers.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">PostgreSQL Database</p>
                <p className="text-[10px] text-emerald-400">Connected & Synced</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              {systemHealth.stripe ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-white">Stripe Gateway</p>
                <p className={`text-[10px] ${systemHealth.stripe ? "text-emerald-400" : "text-amber-400"}`}>
                  {systemHealth.stripe ? "Production Keys Active" : "Mock / Test Mode"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              {systemHealth.email ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-white">Resend Email</p>
                <p className={`text-[10px] ${systemHealth.email ? "text-emerald-400" : "text-amber-400"}`}>
                  {systemHealth.email ? "API Key Configured" : "Dev Mock Mode"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              {systemHealth.googleOAuth ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-white">Google Calendar Sync</p>
                <p className={`text-[10px] ${systemHealth.googleOAuth ? "text-emerald-400" : "text-amber-400"}`}>
                  {systemHealth.googleOAuth ? "OAuth Configured" : "Setup Needed"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Columns: Recent Organizations & Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Organizations */}
        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-400" />
                Recent Organizations
              </CardTitle>
              <CardDescription>Latest businesses created on the platform.</CardDescription>
            </div>
            <Link
              href="/super-admin/organizations"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-800/60">
              {recentOrganizations.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No organizations registered yet.</p>
              ) : (
                recentOrganizations.map((org) => (
                  <div key={org.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-white">{org.name}</p>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            org.subscriptionPlan === "ENTERPRISE"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : org.subscriptionPlan === "PRO"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {org.subscriptionPlan}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">/{org.slug}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs text-slate-400">
                        <p>{org.bookingCount} bookings</p>
                        <p className="text-[11px] text-slate-500">{org.memberCount} members</p>
                      </div>
                      <Link
                        href={`/book/${org.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                        title="View Public Booking Page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Global Bookings */}
        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-violet-400" />
                Latest Platform Bookings
              </CardTitle>
              <CardDescription>Real-time booking flow across all businesses.</CardDescription>
            </div>
            <Link
              href="/super-admin/bookings"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-800/60">
              {recentBookings.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No bookings placed yet.</p>
              ) : (
                recentBookings.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-white">{b.serviceName}</p>
                      <p className="text-xs text-slate-400">
                        by {b.customerName} @ <span className="text-amber-400">{b.orgName}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-white">{formatPrice(b.priceCents)}</p>
                      <span
                        className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold mt-1 ${
                          b.paymentStatus === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {b.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
