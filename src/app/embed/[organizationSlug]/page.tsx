import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { PublicBookingWizard } from "@/components/booking/public-booking-wizard";
import { Calendar, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface EmbedPageProps {
  params: Promise<{ organizationSlug: string }>;
}

export async function generateMetadata({ params }: EmbedPageProps) {
  const { organizationSlug } = await params;
  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!org) {
    return {
      title: "Organization Not Found | Bookora Embed",
    };
  }

  return {
    title: `Book Online | ${org.name}`,
    description: org.bio || `Schedule your appointment online with ${org.name}. Instant confirmation.`,
  };
}

export default async function EmbedBookingPage({ params }: EmbedPageProps) {
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
    <div className="min-h-full w-full bg-slate-950 text-slate-100 p-3 sm:p-6 antialiased selection:bg-violet-500 selection:text-white overflow-x-hidden">
      {/* Compact Embed Header */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base capitalize leading-tight">{org.name}</h1>
            <p className="text-xs text-slate-400">Online Appointment Booking</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-300">
          <Sparkles className="h-3 w-3 text-violet-400" />
          <span>Verified Booking</span>
        </span>
      </div>

      {/* Embed Container for Public Booking Wizard */}
      <main className="max-w-4xl mx-auto">
        <Suspense
          fallback={
            <div className="space-y-4 p-4">
              <Skeleton className="h-12 w-full rounded-xl bg-slate-900" />
              <Skeleton className="h-60 w-full rounded-xl bg-slate-900" />
            </div>
          }
        >
          <PublicBookingWizard organization={organizationData} services={servicesData} />
        </Suspense>
      </main>

      {/* Subtle Footer */}
      <footer className="max-w-4xl mx-auto mt-8 pt-4 border-t border-slate-800/40 flex items-center justify-between text-[11px] text-slate-500">
        <span>{org.name} • Instant Scheduling</span>
        <span className="font-medium">Powered by Bookora</span>
      </footer>
    </div>
  );
}
