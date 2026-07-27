import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatInTimeZone } from "date-fns-tz";
import { CheckCircle2, Calendar, Clock, MapPin, Mail, User, Phone, Sparkles, ArrowLeft, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export interface ConfirmationPageProps {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ booking_id?: string; bookingId?: string; session_id?: string }>;
}

export default async function BookingConfirmationPage({ params, searchParams }: ConfirmationPageProps) {
  const { organizationSlug } = await params;
  const sParams = await searchParams;
  const bookingId = sParams.booking_id || sParams.bookingId;

  const org = await db.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!org) {
    notFound();
  }

  let booking = null;
  if (bookingId) {
    booking = await db.booking.findFirst({
      where: {
        id: bookingId,
        organizationId: org.id,
      },
      include: {
        service: true,
        payment: true,
      },
    });
  }

  const timezone = org.timezone || "UTC";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-violet-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
          <Link
            href={`/book/${organizationSlug}`}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Book Another Appointment</span>
          </Link>
          <span className="text-xs text-slate-400 font-medium">Powered by Bookora</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {booking ? (
          <Card className="glass-card border-violet-500/30 bg-slate-900/60 shadow-2xl overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600/20 via-violet-600/20 to-indigo-600/20 p-8 text-center border-b border-slate-800">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mb-4 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Booking Confirmed!</h1>
              <p className="text-slate-300 text-sm mt-1 max-w-md mx-auto">
                Thank you, <strong className="text-white">{booking.customerName}</strong>. Your appointment with{" "}
                <strong className="text-white">{org.name}</strong> has been successfully scheduled.
              </p>
              <div className="mt-3 inline-flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-bold">
                  Status: {booking.status}
                </Badge>
                {booking.paymentStatus === "PAID" && (
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40 text-xs px-3 py-1 font-bold">
                    Payment Verified
                  </Badge>
                )}
              </div>
            </div>

            <CardContent className="p-8 space-y-6">
              {/* Appointment Details Grid */}
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Booking Reference</span>
                  <code className="text-xs font-mono bg-slate-900 border border-slate-800 text-violet-300 px-2.5 py-1 rounded-md">
                    {booking.id}
                  </code>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Service</span>
                  <span className="text-base font-bold text-white">{booking.service.name}</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Date & Time</span>
                  <div className="sm:text-right">
                    <div className="text-sm font-bold text-white flex items-center sm:justify-end gap-1.5">
                      <Calendar className="h-4 w-4 text-violet-400" />
                      <span>{formatInTimeZone(booking.startAt, timezone, "EEEE, MMMM d, yyyy")}</span>
                    </div>
                    <div className="text-xs font-semibold text-violet-300 flex items-center sm:justify-end gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {formatInTimeZone(booking.startAt, timezone, "HH:mm")} –{" "}
                        {formatInTimeZone(booking.endAt, timezone, "HH:mm")} ({timezone})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Details</span>
                  <div className="sm:text-right text-xs text-slate-300 space-y-0.5">
                    <div className="font-semibold text-white">{booking.customerName}</div>
                    <div>{booking.customerEmail}</div>
                    {booking.customerPhone && <div>{booking.customerPhone}</div>}
                  </div>
                </div>

                {booking.notes && (
                  <div className="border-b border-slate-800/80 pb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Special Notes
                    </span>
                    <p className="text-xs text-slate-300 italic bg-slate-900/40 p-3 rounded-xl border border-slate-800/60">
                      "{booking.notes}"
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount Paid</span>
                  <span className="text-xl font-extrabold text-white">
                    {booking.service.price === 0
                      ? "FREE"
                      : formatPrice(booking.service.price, booking.service.currency)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/20 text-xs text-violet-300 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 shrink-0 text-violet-400" />
                <span>
                  A confirmation email notification has been dispatched to <strong>{booking.customerEmail}</strong>.
                </span>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-950/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">Need to make changes? Contact {org.name}.</span>
              <Link href={`/book/${organizationSlug}`}>
                <Button className="bg-violet-600 hover:bg-violet-500 font-semibold">Book Another Appointment</Button>
              </Link>
            </CardFooter>
          </Card>
        ) : (
          <Card className="glass-card text-center p-12 border-slate-800 bg-slate-900/60">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20 text-violet-400 mb-4">
              <Sparkles className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl text-white">Booking Confirmation</CardTitle>
            <CardDescription className="text-slate-400 mt-2 max-w-sm mx-auto">
              Your appointment booking request has been submitted. Please check your email inbox for complete confirmation details.
            </CardDescription>
            <div className="mt-8">
              <Link href={`/book/${organizationSlug}`}>
                <Button variant="outline">Return to Booking Page</Button>
              </Link>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
