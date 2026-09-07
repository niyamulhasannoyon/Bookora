"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FileText,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { getPlanDetails, PlanTier } from "@/lib/plans";

interface BillingViewProps {
  stats: {
    bookingsThisMonth: number;
    activeServicesCount: number;
    teamMembersCount: number;
    totalRevenueInCents: number;
  };
  subscription?: {
    plan: PlanTier;
    status: string;
    stripeCustomerId: string | null;
    currentPeriodEnd: string | null;
  };
}

export function BillingView({
  stats,
  subscription = { plan: "FREE", status: "ACTIVE", stripeCustomerId: null, currentPeriodEnd: null },
}: BillingViewProps) {
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [notice, setNotice] = useState<string | null>(null);

  const currentPlan = getPlanDetails(subscription.plan);
  const isPaid = subscription.plan === "PRO" || subscription.plan === "ENTERPRISE";

  const handleCheckout = async (planTier: "PRO" | "ENTERPRISE") => {
    setUpgradingPlan(planTier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier, interval: billingInterval }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setNotice(data.error || "Failed to start checkout. Please try again.");
      }
    } catch {
      setNotice("An unexpected error occurred. Please try again.");
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handlePortalRedirect = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setNotice(data.error || "Customer portal unavailable. Please contact support.");
      }
    } catch {
      setNotice("Could not connect to Stripe Billing Portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  // Compute usage percentages
  const servicesPercentage = Math.min(
    100,
    Math.round((stats.activeServicesCount / currentPlan.limits.maxServices) * 100)
  );
  const staffPercentage = Math.min(
    100,
    Math.round((stats.teamMembersCount / currentPlan.limits.maxStaff) * 100)
  );
  const bookingsPercentage = Math.min(
    100,
    Math.round((stats.bookingsThisMonth / currentPlan.limits.maxBookingsPerMonth) * 100)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Billing & Subscription Tier
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your organization plan, team limits, and payment methods.
        </p>
      </div>

      {notice && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Subscription Tier Banner */}
      <Card className="bg-gradient-to-r from-violet-950/80 via-slate-900 to-indigo-950/80 border border-violet-500/30 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span>Current Plan: {currentPlan.name}</span>
            </div>

            <h2 className="text-2xl font-black text-white">
              {currentPlan.priceMonthlyCents === 0
                ? "Free Tier"
                : `$${(currentPlan.priceMonthlyCents / 100).toFixed(2)} / month`}
            </h2>

            <p className="text-xs text-slate-300 max-w-xl">{currentPlan.tagline}</p>

            {subscription.currentPeriodEnd && (
              <p className="text-[11px] text-slate-400 font-mono">
                Current period renews:{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {isPaid ? (
              <Button
                onClick={handlePortalRedirect}
                disabled={portalLoading}
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-2"
              >
                <CreditCard className="h-4 w-4" />
                <span>{portalLoading ? "Opening..." : "Manage Billing & Cards"}</span>
              </Button>
            ) : (
              <Button
                onClick={() => handleCheckout("PRO")}
                disabled={upgradingPlan === "PRO"}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs gap-2 font-bold shadow-lg shadow-violet-500/20"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>{upgradingPlan === "PRO" ? "Connecting..." : "Upgrade to Pro ($29/mo)"}</span>
              </Button>
            )}

            <Link href="/pricing">
              <Button variant="outline" size="sm" className="text-xs border-slate-700 text-slate-300">
                Compare All Plans
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Usage Capacity Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Bookings Processed
            </span>
            <div className="text-2xl font-black text-white mt-2">
              {stats.bookingsThisMonth}{" "}
              <span className="text-xs font-normal text-slate-500">
                / {currentPlan.limits.maxBookingsPerMonth >= 99999 ? "Unlimited" : currentPlan.limits.maxBookingsPerMonth}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full ${bookingsPercentage > 85 ? "bg-rose-500" : "bg-violet-500"}`}
                style={{ width: `${bookingsPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Services
            </span>
            <div className="text-2xl font-black text-white mt-2">
              {stats.activeServicesCount}{" "}
              <span className="text-xs font-normal text-slate-500">
                / {currentPlan.limits.maxServices >= 999 ? "Unlimited" : currentPlan.limits.maxServices}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full ${servicesPercentage > 85 ? "bg-amber-500" : "bg-indigo-500"}`}
                style={{ width: `${servicesPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Team Capacity
            </span>
            <div className="text-2xl font-black text-white mt-2">
              {stats.teamMembersCount}{" "}
              <span className="text-xs font-normal text-slate-500">
                / {currentPlan.limits.maxStaff >= 999 ? "Unlimited" : `${currentPlan.limits.maxStaff} Staff`}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full ${staffPercentage > 85 ? "bg-amber-500" : "bg-cyan-500"}`}
                style={{ width: `${staffPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Upgrades Section (if on Free or Pro) */}
      {subscription.plan !== "ENTERPRISE" && (
        <Card className="bg-slate-900/40 border border-slate-800 shadow-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                Upgrade Your Subscription Plan
              </CardTitle>
              <CardDescription>Scale capacity and unlock Google Calendar 2-way sync.</CardDescription>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setBillingInterval("month")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  billingInterval === "month"
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("year")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  billingInterval === "year"
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Yearly <span className="text-[10px] text-emerald-300 font-bold ml-1">Save 17%</span>
              </button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pro Plan Card */}
              {subscription.plan === "FREE" && (
                <div className="p-5 rounded-2xl border border-violet-500/30 bg-violet-950/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-white text-base">Professional</h3>
                      <p className="text-xs text-slate-400">For growing businesses & small teams</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Most Popular
                    </span>
                  </div>

                  <div className="text-2xl font-black text-white">
                    {billingInterval === "month" ? "$29.00 / mo" : "$290.00 / yr"}
                  </div>

                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Up to 15 Active Services</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Up to 5 Team Members & Staff</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Google Calendar 2-Way Sync</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>Automated 24h & 1h Email Reminders</span>
                    </li>
                  </ul>

                  <Button
                    onClick={() => handleCheckout("PRO")}
                    disabled={upgradingPlan === "PRO"}
                    className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs gap-2"
                  >
                    <span>{upgradingPlan === "PRO" ? "Redirecting..." : "Upgrade to Pro"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Enterprise Plan Card */}
              <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-base">Enterprise</h3>
                    <p className="text-xs text-slate-400">For established clinics & multi-staff businesses</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Unlimited
                  </span>
                </div>

                <div className="text-2xl font-black text-white">
                  {billingInterval === "month" ? "$79.00 / mo" : "$790.00 / yr"}
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Services & Staff Members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Unlimited Monthly Appointments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Priority 24/7 Dedicated Support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Custom Website Widget & Embedding</span>
                  </li>
                </ul>

                <Button
                  onClick={() => handleCheckout("ENTERPRISE")}
                  disabled={upgradingPlan === "ENTERPRISE"}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs gap-2"
                >
                  <span>{upgradingPlan === "ENTERPRISE" ? "Redirecting..." : "Upgrade to Enterprise"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
