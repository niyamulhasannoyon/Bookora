"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays, isBefore, startOfDay, parseISO } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  User,
  Mail,
  Phone,
  CreditCard,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Globe,
  AlertCircle,
  RotateCcw,
  Check,
  FileText,
  ShieldCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatPrice } from "@/lib/utils";

export interface PublicService {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface PublicOrganization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  bio?: string | null;
  timezone: string;
}

interface PublicBookingWizardProps {
  organization: PublicOrganization;
  services: PublicService[];
}

export interface TimeSlot {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  available: boolean;
  reason?: string;
}

export function PublicBookingWizard({ organization, services }: PublicBookingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard state: 1 = Service, 2 = Date & Time, 3 = Details, 4 = Summary & Confirm
  const initialServiceId = searchParams.get("serviceId");
  const defaultService = services.find((s) => s.id === initialServiceId || s.slug === initialServiceId) || null;

  const [selectedService, setSelectedService] = useState<PublicService | null>(defaultService);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Form input state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Validation & Error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Slots fetching state
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // Booking submission state
  const [submitting, setSubmitting] = useState(false);

  // Step state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(defaultService ? 2 : 1);

  // Generate next 14 days for date selection
  const today = startOfDay(new Date());
  const dateOptions = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  // Fetch slots whenever selectedService or selectedDate changes
  useEffect(() => {
    if (!selectedService || step !== 2) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSlotsError(null);
      setSelectedSlot(null);

      const dateStr = format(selectedDate, "yyyy-MM-dd");
      try {
        const res = await fetch(
          `/api/public/slots?orgSlug=${organization.slug}&serviceId=${selectedService.id}&date=${dateStr}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load time slots.");
        }

        setSlots(data.slots || []);
      } catch (err: any) {
        console.error("Error fetching slots:", err);
        setSlotsError(err.message || "Unable to fetch available time slots.");
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedService, selectedDate, organization.slug, step]);

  // Form Validation
  const validateDetails = () => {
    const newErrors: Record<string, string> = {};
    if (!customerName.trim()) {
      newErrors.customerName = "Full name is required.";
    }
    if (!customerEmail.trim()) {
      newErrors.customerEmail = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      newErrors.customerEmail = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Booking (Free or Paid)
  const handleBookingSubmit = async () => {
    if (!selectedService || !selectedSlot) return;

    setServerError(null);
    setSubmitting(true);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug: organization.slug,
          serviceId: selectedService.id,
          dateStr,
          slotTime: selectedSlot.startTime,
          customerName,
          customerEmail,
          customerPhone,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process booking request.");
      }

      if (data.isFree && data.redirectUrl) {
        router.push(data.redirectUrl);
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Invalid response from booking server.");
      }
    } catch (err: any) {
      console.error("Booking submission error:", err);
      setServerError(err.message || "An error occurred while creating your booking. Please try again.");
      setSubmitting(false);
    }
  };

  const availableSlotsCount = slots.filter((s) => s.available).length;

  return (
    <div className="space-y-8">
      {/* Step Indicator Progress Bar */}
      <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <nav aria-label="Booking Progress" className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { number: 1, title: "Service" },
            { number: 2, title: "Date & Time" },
            { number: 3, title: "Details" },
            { number: 4, title: "Confirm" },
          ].map((st, idx) => {
            const isCompleted = step > st.number;
            const isCurrent = step === st.number;
            return (
              <div key={st.number} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={st.number > step}
                  onClick={() => {
                    if (st.number < step) setStep(st.number as any);
                  }}
                  className={`flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1.5 transition-all ${
                    isCurrent
                      ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 ring-2 ring-violet-400/50"
                      : isCompleted
                      ? "bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
                      : "bg-slate-900 text-slate-500 cursor-not-allowed"
                  }`}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold border border-current">
                    {isCompleted ? <Check className="h-3 w-3" /> : st.number}
                  </span>
                  <span className="hidden sm:inline">{st.title}</span>
                </button>
                {idx < 3 && <div className="h-0.5 w-4 sm:w-8 bg-slate-800" />}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Main Wizard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Step Content (Left / Main) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Select Active Service */}
          {step === 1 && (
            <Card className="glass-card border-slate-800 bg-slate-900/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl sm:text-2xl text-white font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-400" />
                    <span>Select a Service</span>
                  </CardTitle>
                  <Badge variant="outline" className="text-xs border-violet-500/30 bg-violet-500/10 text-violet-300">
                    {services.length} Active {services.length === 1 ? "Service" : "Services"}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400 text-sm">
                  Choose the service you wish to schedule with {organization.name}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {services.length === 0 ? (
                  <EmptyState
                    title="No Services Available"
                    description="This organization does not currently have any active services available for public booking."
                  />
                ) : (
                  services.map((svc) => {
                    const isSelected = selectedService?.id === svc.id;
                    const isFree = svc.price === 0;
                    return (
                      <div
                        key={svc.id}
                        onClick={() => {
                          setSelectedService(svc);
                          setSelectedSlot(null);
                        }}
                        tabIndex={0}
                        role="button"
                        aria-pressed={isSelected}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setSelectedService(svc);
                            setSelectedSlot(null);
                          }
                        }}
                        className={`group relative p-5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-violet-950/40 border-violet-500/80 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-white group-hover:text-violet-300 transition-colors">
                                {svc.name}
                              </h3>
                              {isFree && (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] uppercase tracking-wider font-bold">
                                  Free Service
                                </Badge>
                              )}
                            </div>
                            {svc.description && (
                              <p className="text-sm text-slate-400 leading-relaxed">{svc.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-violet-400" />
                                {svc.durationMinutes} minutes
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-slate-500" />
                                {organization.timezone}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                            <div className="text-right">
                              <div className="text-[10px] uppercase font-bold text-slate-400">Price</div>
                              <div className="text-xl font-extrabold text-white">
                                {isFree ? "FREE" : formatPrice(svc.price, svc.currency)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant={isSelected ? "default" : "outline"}
                              className={isSelected ? "bg-violet-600 hover:bg-violet-500" : ""}
                            >
                              {isSelected ? "Selected" : "Select"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t border-slate-800/80 pt-4">
                <Button
                  disabled={!selectedService}
                  onClick={() => setStep(2)}
                  className="gap-2 bg-violet-600 hover:bg-violet-500"
                >
                  <span>Select Date & Time</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* STEP 2: Select Date & Time */}
          {step === 2 && selectedService && (
            <Card className="glass-card border-slate-800 bg-slate-900/50">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-xl sm:text-2xl text-white font-bold flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-violet-400" />
                    <span>Select Date & Time</span>
                  </CardTitle>
                  {/* Timezone Indicator */}
                  <div className="flex items-center gap-1.5 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full font-medium">
                    <Globe className="h-3.5 w-3.5" />
                    <span>Times shown in {organization.timezone}</span>
                  </div>
                </div>
                <CardDescription className="text-slate-400 text-sm">
                  Pick an available date and time slot for <strong className="text-slate-200">{selectedService.name}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Picker Grid */}
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-400 mb-3 tracking-wider">
                    Choose Date
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {dateOptions.map((date) => {
                      const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                      const isPast = isBefore(date, today);
                      return (
                        <button
                          key={date.toISOString()}
                          type="button"
                          disabled={isPast}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedSlot(null);
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? "bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/20 ring-1 ring-violet-400"
                              : isPast
                              ? "bg-slate-950/40 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed"
                              : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                          }`}
                        >
                          <span className="text-[10px] uppercase font-bold text-slate-400">{format(date, "EEE")}</span>
                          <span className="text-lg font-extrabold mt-0.5">{format(date, "d")}</span>
                          <span className="text-[10px] text-slate-400">{format(date, "MMM")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Time Slots Section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-semibold uppercase text-slate-400 tracking-wider">
                      Available Slots for {format(selectedDate, "EEEE, MMMM d")}
                    </label>
                    {!loadingSlots && !slotsError && (
                      <span className="text-xs text-slate-400 font-medium">
                        {availableSlotsCount} {availableSlotsCount === 1 ? "slot available" : "slots available"}
                      </span>
                    )}
                  </div>

                  {/* Loading Skeletons */}
                  {loadingSlots && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-12 w-full rounded-xl" />
                      ))}
                    </div>
                  )}

                  {/* Error State */}
                  {!loadingSlots && slotsError && (
                    <ErrorState
                      title="Unable to load time slots"
                      description={slotsError}
                      retry={() => {
                        setSelectedDate(new Date(selectedDate.getTime()));
                      }}
                    />
                  )}

                  {/* Empty Availability State */}
                  {!loadingSlots && !slotsError && slots.length === 0 && (
                    <EmptyState
                      icon={Clock}
                      title="No available slots"
                      description="There are no open appointment slots for the selected date. Please pick another date."
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                        >
                          Check Next Day ({format(addDays(selectedDate, 1), "MMM d")})
                        </Button>
                      }
                    />
                  )}

                  {/* Time Slots List */}
                  {!loadingSlots && !slotsError && slots.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const isAvailable = slot.available;
                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                              isSelected
                                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-md shadow-violet-500/20 ring-1 ring-violet-300"
                                : !isAvailable
                                ? "bg-slate-950/40 border-slate-900 text-slate-600 line-through cursor-not-allowed opacity-50"
                                : "bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <span>{slot.startTime}</span>
                            {slot.endTime && (
                              <span className="block text-[10px] font-normal text-slate-400">
                                until {slot.endTime}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Services</span>
                </Button>
                <Button
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                  className="gap-2 bg-violet-600 hover:bg-violet-500"
                >
                  <span>Enter Details</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* STEP 3: Customer Details */}
          {step === 3 && selectedService && selectedSlot && (
            <Card className="glass-card border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl text-white font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-violet-400" />
                  <span>Customer Information</span>
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Please provide your contact information to reserve this appointment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="customerName" className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Full Name <span className="text-violet-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customerName"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: "" }));
                      }}
                      placeholder="e.g. Alex Morgan"
                      aria-invalid={!!errors.customerName}
                      aria-describedby={errors.customerName ? "customerName-error" : undefined}
                      className={`w-full rounded-xl border bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                        errors.customerName ? "border-red-500" : "border-slate-800 focus:border-violet-500"
                      }`}
                    />
                  </div>
                  {errors.customerName && (
                    <p id="customerName-error" className="mt-1 text-xs text-red-400" aria-live="polite">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="customerEmail" className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Email Address <span className="text-violet-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customerEmail"
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (errors.customerEmail) setErrors((prev) => ({ ...prev, customerEmail: "" }));
                      }}
                      placeholder="alex@example.com"
                      aria-invalid={!!errors.customerEmail}
                      aria-describedby={errors.customerEmail ? "customerEmail-error" : undefined}
                      className={`w-full rounded-xl border bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 ${
                        errors.customerEmail ? "border-red-500" : "border-slate-800 focus:border-violet-500"
                      }`}
                    />
                  </div>
                  {errors.customerEmail && (
                    <p id="customerEmail-error" className="mt-1 text-xs text-red-400" aria-live="polite">
                      {errors.customerEmail}
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="customerPhone" className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Phone Number <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customerPhone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>
                </div>

                {/* Optional Notes */}
                <div>
                  <label htmlFor="notes" className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                    Special Notes or Preferences <span className="text-slate-500 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any specific requests or instructions for your appointment..."
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Time</span>
                </Button>
                <Button
                  onClick={() => {
                    if (validateDetails()) setStep(4);
                  }}
                  className="gap-2 bg-violet-600 hover:bg-violet-500"
                >
                  <span>Review Booking</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* STEP 4: Review Summary & Confirm / Payment */}
          {step === 4 && selectedService && selectedSlot && (
            <Card className="glass-card border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl text-white font-bold flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-violet-400" />
                  <span>Review & Confirm</span>
                </CardTitle>
                <CardDescription className="text-slate-400 text-sm">
                  Please review your appointment summary before final confirmation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {serverError && (
                  <div
                    className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-start gap-3"
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold text-red-100">Booking Error</p>
                      <p>{serverError}</p>
                    </div>
                  </div>
                )}

                {/* Detailed Summary Cards */}
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs uppercase font-bold text-slate-400">Organization</span>
                    <span className="text-sm font-semibold text-white">{organization.name}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs uppercase font-bold text-slate-400">Service</span>
                    <span className="text-sm font-semibold text-violet-300">{selectedService.name}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs uppercase font-bold text-slate-400">Duration</span>
                    <span className="text-sm font-medium text-slate-300">{selectedService.durationMinutes} minutes</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs uppercase font-bold text-slate-400">Date & Time</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">
                        {format(selectedDate, "EEEE, MMMM d, yyyy")}
                      </div>
                      <div className="text-xs text-violet-300 font-medium mt-0.5">
                        {selectedSlot.startTime} – {selectedSlot.endTime} ({organization.timezone})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <span className="text-xs uppercase font-bold text-slate-400">Customer</span>
                    <div className="text-right text-sm text-slate-300">
                      <div>{customerName}</div>
                      <div className="text-xs text-slate-400">{customerEmail}</div>
                      {customerPhone && <div className="text-xs text-slate-400">{customerPhone}</div>}
                    </div>
                  </div>

                  {notes && (
                    <div className="border-b border-slate-800/80 pb-3">
                      <span className="text-xs uppercase font-bold text-slate-400 block mb-1">Notes</span>
                      <span className="text-xs text-slate-300 italic">"{notes}"</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm uppercase font-extrabold text-white">Total Amount</span>
                    <span className="text-2xl font-black text-white">
                      {selectedService.price === 0
                        ? "FREE"
                        : formatPrice(selectedService.price, selectedService.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-slate-800/80 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setStep(3)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Details</span>
                </Button>

                <Button
                  onClick={handleBookingSubmit}
                  disabled={submitting}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold shadow-lg shadow-violet-500/20"
                >
                  {submitting ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>{selectedService.price === 0 ? "Confirming..." : "Redirecting to Stripe..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>
                        {selectedService.price === 0 ? "Confirm Free Booking" : "Proceed to Stripe Checkout"}
                      </span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Dynamic Summary Panel */}
        <div className="lg:col-span-4">
          <Card className="glass-card sticky top-24 border-slate-800 bg-slate-900/60">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">
                Booking Summary
              </span>
              <CardTitle className="text-lg text-white font-bold mt-1">
                {organization.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-sm">
              <div>
                <span className="text-xs text-slate-400 block font-semibold uppercase">Service</span>
                <span className="text-slate-200 font-semibold">
                  {selectedService ? selectedService.name : "Not selected"}
                </span>
              </div>

              {selectedService && (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-violet-400" />
                      Duration
                    </span>
                    <span className="font-semibold text-white">{selectedService.durationMinutes} mins</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                      Price
                    </span>
                    <span className="font-bold text-white text-sm">
                      {selectedService.price === 0
                        ? "FREE"
                        : formatPrice(selectedService.price, selectedService.currency)}
                    </span>
                  </div>
                </>
              )}

              {selectedSlot && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Date & Time</span>
                  <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold">
                    <CalendarIcon className="h-3.5 w-3.5 text-violet-400" />
                    <span>{format(selectedDate, "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-violet-200 text-xs font-semibold">
                    <Clock className="h-3.5 w-3.5 text-violet-400" />
                    <span>
                      {selectedSlot.startTime} – {selectedSlot.endTime}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>{organization.timezone}</span>
                  </div>
                </div>
              )}

              {customerName && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase block">Reserved For</span>
                  <span className="text-xs font-semibold text-slate-200 block">{customerName}</span>
                  <span className="text-[11px] text-slate-400 block">{customerEmail}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
