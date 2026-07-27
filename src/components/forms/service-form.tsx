"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, DollarSign, Sparkles, ArrowLeft, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { serviceSchema } from "@/lib/validators";

interface ServiceFormProps {
  initialValues?: {
    id?: string;
    name?: string;
    slug?: string;
    description?: string;
    durationMinutes?: number;
    price?: number; // stored in cents
    currency?: string;
    bufferBefore?: number;
    bufferAfter?: number;
    isActive?: boolean;
  };
  orgSlug?: string;
  isEditing?: boolean;
  onSubmitAction: (formData: any) => Promise<{ success: boolean; error?: string; data?: any }>;
}

export function ServiceForm({
  initialValues,
  orgSlug,
  isEditing = false,
  onSubmitAction,
}: ServiceFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialValues?.name || "");
  const [slug, setSlug] = useState(initialValues?.slug || "");
  const [description, setDescription] = useState(initialValues?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(
    initialValues?.durationMinutes !== undefined ? String(initialValues.durationMinutes) : "30"
  );
  // Initial price converted from cents to major currency (e.g. 5000 cents -> 50.00)
  const [priceMajor, setPriceMajor] = useState(
    initialValues?.price !== undefined ? (initialValues.price / 100).toFixed(2) : "50.00"
  );
  const [currency, setCurrency] = useState(initialValues?.currency || "usd");
  const [bufferBefore, setBufferBefore] = useState(
    initialValues?.bufferBefore !== undefined ? String(initialValues.bufferBefore) : "0"
  );
  const [bufferAfter, setBufferAfter] = useState(
    initialValues?.bufferAfter !== undefined ? String(initialValues.bufferAfter) : "0"
  );
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Automatically generate slug from name if creating or slug hasn't been manually locked
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isEditing && (!slug || slug === slugify(name))) {
      setSlug(slugify(newName));
    }
  };

  function slugify(text: string) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const numericPriceCents = Math.round((parseFloat(priceMajor) || 0) * 100);
    const numericDuration = parseInt(durationMinutes, 10) || 0;
    const numericBufferBefore = parseInt(bufferBefore, 10) || 0;
    const numericBufferAfter = parseInt(bufferAfter, 10) || 0;

    const payload = {
      name,
      slug: slug || slugify(name),
      description,
      durationMinutes: numericDuration,
      duration: numericDuration,
      price: numericPriceCents,
      currency: currency.toLowerCase(),
      bufferBefore: numericBufferBefore,
      bufferAfter: numericBufferAfter,
      isActive,
    };

    // Validate with Zod
    const result = serviceSchema.safeParse(payload);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const path = err.path[0] ? String(err.path[0]) : "form";
        errors[path] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const res = await onSubmitAction(payload);
      if (!res.success) {
        setError(res.error || "An error occurred while saving the service.");
      } else {
        const redirectUrl = orgSlug ? `/${orgSlug}/services` : "/dashboard/services";
        router.push(redirectUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to submit form.");
    } finally {
      setLoading(false);
    }
  };

  const currentPriceCents = Math.round((parseFloat(priceMajor) || 0) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Form (2 cols) */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Action Failed</p>
                <p className="text-red-300/90 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Details Card */}
          <Card className="bg-slate-900/60 border border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">General Information</CardTitle>
              <CardDescription className="text-slate-400">
                Specify service name, URL identifier, and public summary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Service Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Haircut & Styling"
                  value={name}
                  onChange={handleNameChange}
                  className="bg-slate-950/80 border-slate-800 focus:border-violet-500 text-white"
                  required
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-400 mt-1">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  URL Slug <span className="text-red-400">*</span>
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-800 bg-slate-950/80">
                  <span className="bg-slate-900 px-3 py-2 text-xs text-slate-400 flex items-center border-r border-slate-800">
                    bookora.com/services/
                  </span>
                  <input
                    type="text"
                    placeholder="haircut-and-styling"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2 text-xs text-white outline-none"
                    required
                  />
                </div>
                {fieldErrors.slug && (
                  <p className="text-xs text-red-400 mt-1">{fieldErrors.slug}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what customers should expect during this service..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
                {fieldErrors.description && (
                  <p className="text-xs text-red-400 mt-1">{fieldErrors.description}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Duration Card */}
          <Card className="bg-slate-900/60 border border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Pricing & Duration</CardTitle>
              <CardDescription className="text-slate-400">
                Configure appointment timing, pricing amount, and currency.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration (Minutes) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={5}
                      step={5}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="bg-slate-950/80 border-slate-800 focus:border-violet-500 text-white pl-9"
                      required
                    />
                    <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  {fieldErrors.durationMinutes && (
                    <p className="text-xs text-red-400 mt-1">{fieldErrors.durationMinutes}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Price Amount <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={priceMajor}
                      onChange={(e) => setPriceMajor(e.target.value)}
                      className="bg-slate-950/80 border-slate-800 focus:border-violet-500 text-white pl-9"
                      required
                    />
                    <DollarSign className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                  {fieldErrors.price && (
                    <p className="text-xs text-red-400 mt-1">{fieldErrors.price}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="gbp">GBP (£)</option>
                    <option value="cad">CAD ($)</option>
                    <option value="aud">AUD ($)</option>
                    <option value="bdt">BDT (৳)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Buffer Before (Mins)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={bufferBefore}
                    onChange={(e) => setBufferBefore(e.target.value)}
                    className="bg-slate-950/80 border-slate-800 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Buffer After (Mins)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={5}
                    value={bufferAfter}
                    onChange={(e) => setBufferAfter(e.target.value)}
                    className="bg-slate-950/80 border-slate-800 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visibility & Active Switch Card */}
          <Card className="bg-slate-900/60 border border-slate-800">
            <CardContent className="py-5 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Active Service Status</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  When active, clients can discover and book this service. Inactive services cannot be booked.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </CardContent>
          </Card>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white gap-2 min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Update Service" : "Create Service"}</span>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Live Preview Sidebar (1 col) */}
      <div className="space-y-4">
        <div className="sticky top-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span>Live Client Preview</span>
          </div>

          <Card className="bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800/80 bg-gradient-to-br from-slate-900 to-violet-950/30">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                  Service Preview
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-2">
                {name || "Untitled Service"}
              </h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {description || "No description provided."}
              </p>
            </div>

            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="h-4 w-4 text-violet-400" />
                  <span>{durationMinutes} minutes</span>
                </div>
                <div className="text-lg font-extrabold text-white">
                  {formatPrice(currentPriceCents, currency)}
                </div>
              </div>

              {(parseInt(bufferBefore) > 0 || parseInt(bufferAfter) > 0) && (
                <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  Buffer time: +{bufferBefore}m before / +{bufferAfter}m after
                </div>
              )}

              <Button
                disabled={!isActive}
                className="w-full text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500"
              >
                {isActive ? "Book Appointment" : "Service Unavailable"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
