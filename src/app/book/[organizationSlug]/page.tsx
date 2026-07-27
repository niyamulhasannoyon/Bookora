import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { PublicBookingWizard } from "@/components/booking/public-booking-wizard";
import { Calendar, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface PageProps {
  params: Promise<{ organizationSlug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { organizationSlug } = await params;
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!org) {
    return {
      title: "Organization Not Found | Bookora",
    };
  }

  return {
    title: `Book an Appointment | ${org.name}`,
    description: org.bio || `Schedule your appointment online with ${org.name}. Fast, easy, and instant confirmation.`,
  };
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { organizationSlug } = await params;

  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!org) {
    notFound();
  }

  const activeServices = await db.service.findMany({
    where: {
      organizationId: org.id,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const organizationData = {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logo: org.logo,
    bio: org.bio,
    timezone: org.timezone || "UTC",
  };

  const servicesData = activeServices.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    durationMinutes: s.durationMinutes,
    price: s.price,
    currency: s.currency,
    isActive: s.isActive,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3 font-bold text-white text-lg capitalize">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span>{org.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Powered by Bookora</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Organization Banner */}
        <div className="glass-card rounded-3xl p-8 mb-10 border border-violet-500/20 bg-gradient-to-br from-violet-950/30 via-slate-900/40 to-indigo-950/20 text-center shadow-xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Verified Appointment Provider</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold capitalize text-white tracking-tight">{org.name}</h1>
          {org.bio ? (
            <p className="text-slate-300 text-sm max-w-xl mx-auto mt-2 leading-relaxed">{org.bio}</p>
          ) : (
            <p className="text-slate-300 text-sm max-w-xl mx-auto mt-2 leading-relaxed">
              Select a service below to view real-time availability and schedule your appointment instantly.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mt-4">
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              Instant Real-Time Availability
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Secure Automated Confirmation
            </span>
          </div>
        </div>

        {/* Public Booking Wizard wrapped in Suspense */}
        <Suspense
          fallback={
            <div className="space-y-6">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          }
        >
          <PublicBookingWizard organization={organizationData} services={servicesData} />
        </Suspense>
      </main>
    </div>
  );
}
