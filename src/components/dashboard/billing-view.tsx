"use client";

import { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface BillingViewProps {
  stats: {
    bookingsThisMonth: number;
    activeServicesCount: number;
    teamMembersCount: number;
    totalRevenueInCents: number;
  };
}

export function BillingView({ stats }: BillingViewProps) {
  const [upgrading, setUpgrading] = useState(false);

  const handlePortalRedirect = () => {
    setUpgrading(true);
    setTimeout(() => {
      alert("Redirecting to Stripe Customer Portal...");
      setUpgrading(false);
    }, 1000);
  };

  const invoices = [
    {
      id: "inv_109283",
      date: "Jul 1, 2026",
      amount: 4900,
      status: "PAID",
      description: "Bookora Pro Plan - Monthly Subscription",
    },
    {
      id: "inv_108172",
      date: "Jun 1, 2026",
      amount: 4900,
      status: "PAID",
      description: "Bookora Pro Plan - Monthly Subscription",
    },
    {
      id: "inv_107061",
      date: "May 1, 2026",
      amount: 4900,
      status: "PAID",
      description: "Bookora Pro Plan - Monthly Subscription",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Billing & Subscription Plan
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your subscription tier, billing invoices, usage capacity, and payment methods.
        </p>
      </div>

      {/* Subscription Tier Banner */}
      <Card className="bg-gradient-to-r from-violet-950/80 via-slate-900 to-indigo-950/80 border border-violet-500/30 shadow-2xl overflow-hidden relative">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              <span>Current Plan: Pro Tier</span>
            </div>
            <h2 className="text-2xl font-black text-white">$49.00 / month</h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Includes unlimited bookings, custom weekly schedules, holiday overrides, email notifications, and Google Calendar sync.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handlePortalRedirect}
              disabled={upgrading}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-2"
            >
              <CreditCard className="h-4 w-4" />
              <span>{upgrading ? "Loading..." : "Manage Billing in Stripe"}</span>
            </Button>
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
              {stats.bookingsThisMonth} <span className="text-xs font-normal text-slate-500">/ Unlimited</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-violet-500 h-full w-[25%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Services
            </span>
            <div className="text-2xl font-black text-white mt-2">
              {stats.activeServicesCount} <span className="text-xs font-normal text-slate-500">/ 20</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-500 h-full w-[35%]" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
          <CardContent className="p-5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Team Capacity
            </span>
            <div className="text-2xl font-black text-white mt-2">
              {stats.teamMembersCount} <span className="text-xs font-normal text-slate-500">/ 10 Staff</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-cyan-500 h-full w-[20%]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice History Table */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            Billing History & Receipts
          </CardTitle>
          <CardDescription>Recent subscription statements and payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40">
                    <td className="py-3.5 font-medium text-white">
                      <div>{inv.description}</div>
                      <div className="text-xs text-slate-500 font-mono">{inv.id}</div>
                    </td>
                    <td className="py-3.5 text-xs text-slate-300 font-mono">{inv.date}</td>
                    <td className="py-3.5 font-bold text-white">{formatPrice(inv.amount)}</td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Button variant="ghost" size="sm" className="text-xs text-violet-400 hover:text-violet-300">
                        Download PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
