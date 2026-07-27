import Link from "next/link";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { BookingCalendar } from "@/components/booking-calendar";

export default async function ServiceBookingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; serviceSlug: string }>;
}) {
  const { orgSlug, serviceSlug } = await params;
  const orgName = orgSlug.replace(/-/g, " ");

  // Mock lookup for target service
  const service = {
    id: "s1",
    name: serviceSlug === "beard-trim-and-facial" ? "Beard Trim & Hot Towel Treatment" : "Signature Haircut & Styling",
    description: "Includes professional consultation, wash, precision cutting/grooming, and custom finish.",
    duration: serviceSlug === "beard-trim-and-facial" ? 30 : 45,
    price: serviceSlug === "beard-trim-and-facial" ? 3500 : 6500,
    currency: "USD",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href={`/${orgSlug}`} className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {orgName}</span>
          </Link>
          <span className="text-xs text-slate-400 font-medium">Bookora Booking Portal</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <BookingCalendar service={service} orgSlug={orgSlug} />
      </main>
    </div>
  );
}
