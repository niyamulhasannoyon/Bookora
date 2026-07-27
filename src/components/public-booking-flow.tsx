"use client";

import { useState, useEffect } from "react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  User,
  Mail,
  Phone,
  CreditCard,
  Sparkles,
  Globe,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatPrice } from "@/lib/utils";

export interface ServiceData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  isActive: boolean;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
  logo?: string | null;
  timezone: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  startAt?: string;
  endAt?: string;
  available: boolean;
  reason?: string;
}

interface PublicBookingFlowProps {
  organization: OrganizationData;
  services: ServiceData[];
  initialServiceId?: string;
}

export function PublicBookingFlow({
  organization,
  services,
  initialServiceId,
}: PublicBookingFlowProps) {
  // Filter active services strictly
  const activeServices = services.filter((s) => s.isActive);

  // Initial state selection
  const [selectedService, setSelectedService] = useState<ServiceData | null>(
    activeServices.find((s) => s.id === initialServiceId || s.slug === initialServiceId) ||
      (activeServices.length > 0 ? activeServices[0] : null)
  );

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Booking Flow Steps: "service" | "slot" | "details" | "summary" | "processing"
  const [step, setStep] = useState<"service" | "slot" | "details" | "summary" | "processing">(
    selectedService ? "slot" : "service"
  );

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Validation Errors
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Dynamic Slot Fetching State
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 14 days booking window
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  // Fetch available slots when selected date or service changes
  const fetchSlots = async (date: Date, serviceId: string) => {
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedSlot(null);

    const dateStr = format(date, "yyyy-MM-dd");

    try {
      const res = await fetch(
        `/api/public/slots?orgSlug=${encodeURIComponent(
          organization.slug
        )}&serviceId=${encodeURIComponent(serviceId)}&date=${dateStr}`
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch availability slots.");
      }

      setSlots(data.slots || []);
    } catch (err: any) {
      console.error("Fetch slots error:", err);
      setSlotsError(err.message || "Unable to load time slots.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchSlots(selectedDate, selectedService.id);
    }
  }, [selectedService?.id, selectedDate]);

  // Form Validation Handler
  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    if (!customerName.trim()) {
      errors.name = "Full name is required.";
    }

    if (!customerEmail.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setStep("summary");
    }
  };

  // Submit Booking to Server API
  const handleBookingSubmit = async () => {
    if (!selectedService || !selectedSlot) return;

    setSubmitError(null);
    setStep("processing");

    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug: organization.slug,
          serviceId: selectedService.id,
          dateStr: format(selectedDate, "yyyy-MM-dd"),
          slotTime: selectedSlot.startTime,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          customerPhone: customerPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process booking.");
      }

      if (data.isFree && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error("Unexpected server response format.");
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      setSubmitError(err.message || "An unexpected error occurred during booking.");
      setStep("summary");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-5xl mx-auto">
      {/* Side Panel: Organization Branding & Booking Overview */}
      <div className="md:col-span-4 space-y-6">
        <Card className="sticky top-8 border border-slate-800 bg-slate-950/80 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              {organization.logo ? (
                <img
                  src={organization.logo}
                  alt={organization.name}
                  className="h-12 w-12 rounded-2xl object-cover border border-violet-500/30"
                />
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-violet-500/20">
                  {organization.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <CardTitle className="text-xl capitalize text-white">{organization.name}</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-violet-400 font-medium mt-0.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Provider</span>
                </div>
              </div>
            </div>
            {organization.bio && (
              <CardDescription className="mt-3 text-slate-300 text-xs leading-relaxed">
                {organization.bio}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4 pt-2 border-t border-slate-800/80">
            {/* Timezone Indicator */}
            <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <Globe className="h-4 w-4 text-violet-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Timezone</span>
                <span className="font-medium text-white">{organization.timezone || "UTC"}</span>
              </div>
            </div>

            {/* Selected Service Breakdown */}
            {selectedService && (
              <div className="space-y-3 pt-2">
                <div className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                  Selected Service
                </div>
                <div className="p-3.5 rounded-2xl bg-violet-950/20 border border-violet-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-sm">{selectedService.name}</span>
                    <span className="text-sm font-bold text-violet-300">
                      {selectedService.price === 0
                        ? "FREE"
                        : formatPrice(selectedService.price, selectedService.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-violet-400" />
                    <span>{selectedService.durationMinutes} minutes</span>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Date & Time */}
            {selectedSlot && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-1.5">
                <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                  Appointment Time
                </span>
                <div className="flex items-center gap-2 text-sm text-indigo-300 font-semibold">
                  <CalendarIcon className="h-4 w-4 text-indigo-400" />
                  <span>
                    {format(selectedDate, "EEE, MMM d, yyyy")} at {selectedSlot.startTime}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Booking Content */}
      <div className="md:col-span-8 space-y-6">
        {/* Step Navigation Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/50 p-2 rounded-2xl border border-slate-800/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStep("service")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              step === "service" ? "bg-violet-600 text-white font-bold" : "hover:text-slate-200"
            }`}
          >
            1. Service
          </button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
          <button
            type="button"
            disabled={!selectedService}
            onClick={() => selectedService && setStep("slot")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              step === "slot" ? "bg-violet-600 text-white font-bold" : "hover:text-slate-200"
            } ${!selectedService ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            2. Date & Time
          </button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
          <button
            type="button"
            disabled={!selectedSlot}
            onClick={() => selectedSlot && setStep("details")}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              step === "details" ? "bg-violet-600 text-white font-bold" : "hover:text-slate-200"
            } ${!selectedSlot ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            3. Customer Details
          </button>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
          <span
            className={`px-3 py-1.5 rounded-xl transition-all ${
              step === "summary" || step === "processing"
                ? "bg-violet-600 text-white font-bold"
                : "opacity-50"
            }`}
          >
            4. Summary
          </span>
        </div>

        {/* STEP 1: SERVICE SELECTION */}
        {step === "service" && (
          <Card className="border border-slate-800 bg-slate-950/60">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                <span>Select a Service</span>
              </CardTitle>
              <CardDescription>
                Choose from our active available appointments below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeServices.length === 0 ? (
                <EmptyState
                  title="No Active Services Available"
                  description="This organization does not have any active services available for online booking at this time."
                />
              ) : (
                activeServices.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep("slot");
                      }}
                      className={`group p-5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-violet-950/40 border-violet-500/80 ring-1 ring-violet-500/50"
                          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white text-lg group-hover:text-violet-300 transition-colors">
                              {service.name}
                            </h3>
                            {service.price === 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Free
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {service.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-slate-300 pt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-violet-400" />
                              {service.durationMinutes} mins
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                              Price
                            </span>
                            <span className="text-xl font-bold text-white">
                              {service.price === 0
                                ? "Free"
                                : formatPrice(service.price, service.currency)}
                            </span>
                          </div>
                          <Button size="sm" className="gap-1.5">
                            <span>Select</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 2: DATE & TIME SLOT SELECTION */}
        {step === "slot" && selectedService && (
          <Card className="border border-slate-800 bg-slate-950/60">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-violet-400" />
                    <span>Select Date & Time</span>
                  </CardTitle>
                  <CardDescription>
                    Available time slots in <strong className="text-violet-300">{organization.timezone}</strong>.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep("service")}>
                  Change Service
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selection Strip */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-3">
                  Choose Date
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {availableDates.map((date) => {
                    const isSelected =
                      format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center justify-center min-w-[70px] p-3 rounded-2xl border text-center transition-all shrink-0 ${
                          isSelected
                            ? "bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-600/30"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                      >
                        <span className="text-[10px] text-slate-300 uppercase font-bold">
                          {format(date, "EEE")}
                        </span>
                        <span className="text-lg font-extrabold mt-0.5">{format(date, "d")}</span>
                        <span className="text-[9px] text-slate-400">{format(date, "MMM")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Container */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold uppercase text-slate-400">
                    Available Slots for {format(selectedDate, "EEEE, MMMM d")}
                  </label>
                  <span className="text-[11px] text-violet-400 font-medium">
                    Timezone: {organization.timezone}
                  </span>
                </div>

                {/* Loading State Skeletons */}
                {slotsLoading && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <Skeleton key={idx} className="h-12 w-full rounded-2xl" />
                    ))}
                  </div>
                )}

                {/* Error State */}
                {!slotsLoading && slotsError && (
                  <ErrorState
                    title="Failed to Load Availability"
                    description={slotsError}
                    retry={() => fetchSlots(selectedDate, selectedService.id)}
                  />
                )}

                {/* Empty State */}
                {!slotsLoading && !slotsError && slots.filter((s) => s.available).length === 0 && (
                  <EmptyState
                    icon={CalendarIcon}
                    title="No Available Slots"
                    description={`There are no available appointment times on ${format(
                      selectedDate,
                      "MMMM d, yyyy"
                    )}. Please select another date.`}
                  />
                )}

                {/* Time Slots Grid */}
                {!slotsLoading && !slotsError && slots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all ${
                            !slot.available
                              ? "bg-slate-900/20 border-slate-900 text-slate-600 cursor-not-allowed line-through"
                              : isSelected
                              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-md shadow-violet-600/30 scale-[1.02]"
                              : "bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <Button variant="outline" onClick={() => setStep("service")}>
                  Back
                </Button>
                <Button
                  disabled={!selectedSlot}
                  onClick={() => setStep("details")}
                  className="gap-2"
                >
                  <span>Continue to Details</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: CUSTOMER INFORMATION FORM */}
        {step === "details" && selectedService && selectedSlot && (
          <Card className="border border-slate-800 bg-slate-950/60">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-violet-400" />
                <span>Your Contact Details</span>
              </CardTitle>
              <CardDescription>
                Provide your information so we can confirm your appointment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProceedToSummary} className="space-y-4">
                {/* Full Name Field */}
                <div>
                  <label
                    htmlFor="customer-name"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customer-name"
                      type="text"
                      required
                      aria-required="true"
                      aria-invalid={!!formErrors.name}
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                      }}
                      placeholder="Jane Doe"
                      className={`w-full rounded-2xl border bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-colors ${
                        formErrors.name
                          ? "border-red-500 focus:border-red-400"
                          : "border-slate-800 focus:border-violet-500"
                      }`}
                    />
                  </div>
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>
                  )}
                </div>

                {/* Email Address Field */}
                <div>
                  <label
                    htmlFor="customer-email"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customer-email"
                      type="email"
                      required
                      aria-required="true"
                      aria-invalid={!!formErrors.email}
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (formErrors.email) setFormErrors({ ...formErrors, email: "" });
                      }}
                      placeholder="jane@example.com"
                      className={`w-full rounded-2xl border bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-colors ${
                        formErrors.email
                          ? "border-red-500 focus:border-red-400"
                          : "border-slate-800 focus:border-violet-500"
                      }`}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>
                  )}
                </div>

                {/* Phone Number Field */}
                <div>
                  <label
                    htmlFor="customer-phone"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Phone Number <span className="text-slate-500">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <input
                      id="customer-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Special Notes Field */}
                <div>
                  <label
                    htmlFor="customer-notes"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Special Notes / Preferences <span className="text-slate-500">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                    <textarea
                      id="customer-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any instructions or comments for your appointment..."
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                  <Button type="button" variant="outline" onClick={() => setStep("slot")}>
                    Back
                  </Button>
                  <Button type="submit" className="gap-2">
                    <span>Review Booking</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 4: BOOKING SUMMARY & CHECKOUT CONFIRMATION */}
        {step === "summary" && selectedService && selectedSlot && (
          <Card className="border border-violet-500/30 bg-slate-950/80 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-extrabold text-white flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-violet-400" />
                <span>Confirm Booking Summary</span>
              </CardTitle>
              <CardDescription>
                Please review your appointment details carefully before submitting.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {submitError && (
                <div className="p-4 rounded-2xl border border-red-500/50 bg-red-950/30 text-red-300 text-sm flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Booking Failed</span>
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              {/* Detailed Breakdown Grid */}
              <div className="space-y-4 rounded-2xl bg-slate-900/60 p-5 border border-slate-800">
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Provider</span>
                    <h4 className="text-lg font-bold text-white capitalize">{organization.name}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400 uppercase">Timezone</span>
                    <h4 className="text-sm font-semibold text-violet-300">{organization.timezone}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Service</span>
                    <div className="font-semibold text-white text-base">{selectedService.name}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-violet-400" />
                      <span>{selectedService.durationMinutes} minutes duration</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">
                      Date & Time
                    </span>
                    <div className="font-semibold text-violet-300 text-base flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{format(selectedDate, "EEE, MMM d, yyyy")}</span>
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      At {selectedSlot.startTime}
                    </div>
                  </div>
                </div>

                <div className="py-2 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 uppercase">
                    Customer Information
                  </span>
                  <div className="text-sm font-semibold text-white mt-1">{customerName}</div>
                  <div className="text-xs text-slate-400">{customerEmail}</div>
                  {customerPhone && <div className="text-xs text-slate-400">{customerPhone}</div>}
                  {notes && (
                    <div className="text-xs text-slate-300 italic mt-1 bg-slate-950/40 p-2 rounded-xl border border-slate-800">
                      "{notes}"
                    </div>
                  )}
                </div>

                {/* Total Price */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
                    Total Amount Due
                  </span>
                  <span className="text-2xl font-black text-white">
                    {selectedService.price === 0
                      ? "FREE"
                      : formatPrice(selectedService.price, selectedService.currency)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep("details")}>
                  Back to Details
                </Button>
                <Button
                  onClick={handleBookingSubmit}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold px-8 shadow-lg shadow-violet-600/30"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {selectedService.price === 0
                      ? "Confirm Free Appointment"
                      : "Proceed to Stripe Payment"}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: PROCESSING SCREEN */}
        {step === "processing" && (
          <Card className="border border-violet-500/40 bg-slate-950/80 text-center py-16 px-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 mb-6 animate-pulse border border-violet-500/30 shadow-lg shadow-violet-500/20">
              <Sparkles className="h-8 w-8 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-extrabold text-white">
              {selectedService?.price === 0
                ? "Confirming Your Free Appointment..."
                : "Redirecting to Stripe Checkout..."}
            </CardTitle>
            <CardDescription className="max-w-md mx-auto mt-3 text-slate-300 text-sm leading-relaxed">
              {selectedService?.price === 0
                ? "Please wait while we lock in your time slot and confirm your booking."
                : "Setting up your secure Stripe payment session. You will be redirected shortly."}
            </CardDescription>
          </Card>
        )}
      </div>
    </div>
  );
}
