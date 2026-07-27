"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import { Calendar as CalendarIcon, Clock, CheckCircle2, User, Mail, Phone, CreditCard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface ServiceProps {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  currency: string;
}

interface BookingCalendarProps {
  service: ServiceProps;
  orgSlug: string;
}

export function BookingCalendar({ service, orgSlug }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"slot" | "details" | "processing">("slot");

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Next 7 available days generator
  const availableDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Mock slot generator for UI interaction
  const mockSlots = [
    "09:00", "09:30", "10:00", "11:00", "13:30", "14:00", "15:30", "16:00"
  ];

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("processing");

    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          orgSlug,
          dateStr: format(selectedDate, "yyyy-MM-dd"),
          slotTime: selectedSlot,
          customerName,
          customerEmail,
          customerPhone,
          notes,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Booking error:", err);
      setStep("details");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto">
      {/* Service Summary Side Panel */}
      <div className="md:col-span-4">
        <Card className="sticky top-24 border border-violet-500/20 bg-slate-950/80">
          <CardHeader>
            <span className="text-xs uppercase tracking-wider font-semibold text-violet-400">Selected Service</span>
            <CardTitle className="text-2xl mt-1">{service.name}</CardTitle>
            <CardDescription>{service.description || "Professional service appointment."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300 text-sm">
              <Clock className="h-4 w-4 text-violet-400" />
              <span>{service.duration} minutes</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-sm">
              <CreditCard className="h-4 w-4 text-violet-400" />
              <span className="font-semibold text-white text-lg">{formatPrice(service.price, service.currency)}</span>
            </div>
            {selectedSlot && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400">Selected Appointment</div>
                <div className="flex items-center gap-2 text-sm text-violet-300 font-medium">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{format(selectedDate, "EEEE, MMM d, yyyy")} at {selectedSlot}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Flow */}
      <div className="md:col-span-8">
        {step === "slot" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-violet-400" />
                <span>Select Date & Time</span>
              </CardTitle>
              <CardDescription>Pick an available appointment slot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-3">Choose Date</label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {availableDates.map((date) => {
                    const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/20"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-xs text-slate-400 uppercase font-semibold">{format(date, "EEE")}</span>
                        <span className="text-lg font-bold mt-0.5">{format(date, "d")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-3">
                  Available Slots for {format(selectedDate, "MMM d")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {mockSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-md"
                            : "bg-slate-900/40 border-slate-800 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  disabled={!selectedSlot}
                  onClick={() => setStep("details")}
                  className="gap-2"
                >
                  <span>Continue to Details</span>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "details" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-violet-400" />
                <span>Your Information</span>
              </CardTitle>
              <CardDescription>Enter details to complete your booking reservation.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Special Notes / Requests</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any preferences or comments..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setStep("slot")}>
                    Back
                  </Button>
                  <Button type="submit" size="lg" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    <span>Proceed to Stripe Payment</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "processing" && (
          <Card className="text-center py-16">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-violet-600/20 text-violet-400 mb-4 animate-bounce">
              <Sparkles className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Redirecting to Secure Checkout...</CardTitle>
            <CardDescription className="mt-2">Please wait while we set up your appointment payment with Stripe.</CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
