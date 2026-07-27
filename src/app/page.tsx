import Link from "next/link";
import {
  Calendar,
  Sparkles,
  Scissors,
  Stethoscope,
  GraduationCap,
  Scale,
  Dumbbell,
  Laptop,
  Wrench,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";

export default function LandingPage() {
  const targetIndustries = [
    { name: "Salons & Barbers", icon: Scissors, desc: "Haircuts, styling, spa sessions & nail care" },
    { name: "Doctors & Consultants", icon: Stethoscope, desc: "Patient appointments & telehealth sessions" },
    { name: "Tutors & Coaches", icon: GraduationCap, desc: "1-on-1 tutoring, language & executive coaching" },
    { name: "Lawyers & Legal", icon: Scale, desc: "Legal consultations, retainer sync & case review" },
    { name: "Fitness Trainers", icon: Dumbbell, desc: "Personal training, group classes & gym slots" },
    { name: "Freelancers & Agencies", icon: Laptop, desc: "Client discovery calls & project kickoff meetings" },
    { name: "Repair Services", icon: Wrench, desc: "Home repair, auto service & device maintenance" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-violet-600/20 to-indigo-600/30 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-8 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span>Next-Gen Multi-Tenant Appointment SaaS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Effortless Bookings for{" "}
            <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Every Service Business
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Set up your organization in 2 minutes. Sync Google Calendar, accept instant Stripe payments, and automate customer email notifications with zero hassle.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/onboarding">
              <Button size="lg" className="w-full sm:w-auto text-base gap-2 px-8">
                <span>Create Your Organization</span>
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/demo-salon">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base gap-2 px-8">
                <Globe2 className="h-5 w-5 text-violet-400" />
                <span>Explore Live Demo Storefront</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audience Showcase */}
      <section className="py-20 px-6 border-t border-slate-900 bg-slate-950/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Built For Any Appointment-Based Business</h2>
            <p className="text-slate-400 mt-3 text-base">
              Customizable buffers, duration settings, and payment gateways for every industry.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {targetIndustries.map((ind) => {
              const Icon = ind.icon;
              return (
                <Card key={ind.name} className="glass-card-hover border border-slate-800 bg-slate-900/40">
                  <div className="h-12 w-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-violet-400" />
                  </div>
                  <CardTitle className="text-lg">{ind.name}</CardTitle>
                  <CardDescription className="mt-2 text-xs text-slate-400">{ind.desc}</CardDescription>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-24 px-6 border-t border-slate-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-slate-900/40 border border-slate-800">
              <Zap className="h-8 w-8 text-violet-400 mb-4" />
              <CardTitle>Real-Time Availability Engine</CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                Calculates precise available slots while respecting buffer times, breaks, and existing calendar collisions.
              </CardDescription>
            </Card>

            <Card className="bg-slate-900/40 border border-slate-800">
              <ShieldCheck className="h-8 w-8 text-indigo-400 mb-4" />
              <CardTitle>Stripe Checkout Payments</CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                Collect deposits or full payments seamlessly before confirming customer appointments.
              </CardDescription>
            </Card>

            <Card className="bg-slate-900/40 border border-slate-800">
              <Calendar className="h-8 w-8 text-purple-400 mb-4" />
              <CardTitle>Google Calendar 2-Way Sync</CardTitle>
              <CardDescription className="mt-2 text-slate-400">
                Automatically block busy times from your personal calendar and insert newly booked customer appointments.
              </CardDescription>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="border-t border-slate-800 py-12 px-6 text-center text-slate-400 text-sm">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <Calendar className="h-5 w-5 text-violet-400" />
            <span>Bookora SaaS</span>
          </div>
          <p>© 2026 Bookora Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
