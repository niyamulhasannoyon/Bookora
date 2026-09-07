"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Calendar,
  HelpCircle,
  ArrowRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import { SAAS_PLANS } from "@/lib/plans";

export default function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const faqs = [
    {
      q: "Can I upgrade or downgrade my plan at any time?",
      a: "Yes! You can easily upgrade or change tiers anytime directly from your dashboard billing settings. Changes take effect immediately.",
    },
    {
      q: "Does Bookora take any fee on my booking revenue?",
      a: "No! Unlike other platforms that take 3%–5% of your customer booking transactions, Bookora charges 0% platform transaction fees. All booking payments go straight to your connected Stripe account.",
    },
    {
      q: "How does Google Calendar 2-way sync work?",
      a: "On the Pro and Enterprise plans, you can connect your Google account with 1-click. Bookora automatically reads your personal busy times to prevent collisions, and creates calendar events whenever clients book.",
    },
    {
      q: "Can I embed the booking widget on my own website?",
      a: "Yes! Every business gets an embeddable iframe code and a shareable QR code that works on WordPress, Webflow, Squarespace, or custom websites.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>Transparent Pricing For Every Stage</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Simple Plans,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Zero Hidden Fees
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg">
            Start for free and scale as your appointments grow. No credit card required to start.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="pt-6 flex items-center justify-center">
            <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow-xl">
              <button
                onClick={() => setBillingInterval("month")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  billingInterval === "month"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingInterval("year")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  billingInterval === "year"
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>Yearly Billing</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Save 17%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-16">
          {/* FREE PLAN */}
          <Card className="bg-slate-900/40 border border-slate-800 flex flex-col justify-between relative hover:border-slate-700 transition-all">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl font-bold text-white">Free Starter</CardTitle>
              <CardDescription className="text-xs text-slate-400 min-h-[32px]">
                {SAAS_PLANS.FREE.tagline}
              </CardDescription>

              <div className="pt-4">
                <div className="text-4xl font-black text-white">$0</div>
                <p className="text-xs text-slate-500 mt-1">Free forever, no credit card required</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800/80 pt-6">
                {SAAS_PLANS.FREE.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/onboarding" className="block w-full">
                <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-xs">
                  Get Started Free
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* PRO PLAN */}
          <Card className="bg-gradient-to-b from-violet-950/40 via-slate-900/80 to-slate-900/40 border-2 border-violet-500/60 shadow-2xl flex flex-col justify-between relative scale-105 z-10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
              Most Popular
            </div>

            <CardHeader className="space-y-3 pt-8">
              <CardTitle className="text-xl font-bold text-white">Professional</CardTitle>
              <CardDescription className="text-xs text-slate-300 min-h-[32px]">
                {SAAS_PLANS.PRO.tagline}
              </CardDescription>

              <div className="pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {billingInterval === "month" ? "$29" : "$24"}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-violet-300 mt-1 font-medium">
                  {billingInterval === "month" ? "Billed monthly" : "Billed annually ($290/year)"}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              <ul className="space-y-3 text-xs text-slate-200 border-t border-violet-500/20 pt-6">
                {SAAS_PLANS.PRO.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/onboarding" className="block w-full">
                <Button className="w-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold gap-2">
                  <span>Start 14-Day Free Trial</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* ENTERPRISE PLAN */}
          <Card className="bg-slate-900/40 border border-slate-800 flex flex-col justify-between relative hover:border-slate-700 transition-all">
            <CardHeader className="space-y-3">
              <CardTitle className="text-xl font-bold text-white">Enterprise</CardTitle>
              <CardDescription className="text-xs text-slate-400 min-h-[32px]">
                {SAAS_PLANS.ENTERPRISE.tagline}
              </CardDescription>

              <div className="pt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {billingInterval === "month" ? "$79" : "$65"}
                  </span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {billingInterval === "month" ? "Billed monthly" : "Billed annually ($790/year)"}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-0">
              <ul className="space-y-3 text-xs text-slate-300 border-t border-slate-800/80 pt-6">
                {SAAS_PLANS.ENTERPRISE.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link href="/onboarding" className="block w-full">
                <Button variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-xs">
                  Get Started Enterprise
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <div className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Feature Comparison</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Detailed side-by-side comparison of plan limits and features.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4 text-center">Free Starter</th>
                  <th className="py-3 px-4 text-center">Professional</th>
                  <th className="py-3 px-4 text-center">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Active Services</td>
                  <td className="py-3 px-4 text-center">3 Services</td>
                  <td className="py-3 px-4 text-center font-semibold text-violet-400">15 Services</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Team Members & Staff</td>
                  <td className="py-3 px-4 text-center">1 Member</td>
                  <td className="py-3 px-4 text-center font-semibold text-violet-400">5 Staff</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Monthly Bookings</td>
                  <td className="py-3 px-4 text-center">50 / mo</td>
                  <td className="py-3 px-4 text-center font-semibold text-violet-400">1,000 / mo</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Google Calendar 2-Way Sync</td>
                  <td className="py-3 px-4 text-center text-slate-600">—</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Automated Reminders (24h/1h)</td>
                  <td className="py-3 px-4 text-center text-slate-600">—</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Online Stripe Payments</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Custom Website Embed</td>
                  <td className="py-3 px-4 text-center text-slate-600">—</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">Included</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Platform Transaction Fee</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-400">0%</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-400">0%</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-400">0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-24 max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Frequently Asked Questions</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Have questions? We have answers.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="bg-slate-900/40 border border-slate-800">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-violet-400 shrink-0" />
                    {faq.q}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 pl-6 leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
