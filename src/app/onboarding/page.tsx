"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Sparkles, Globe, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { slugify } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Salon & Beauty");
  const [timezone, setTimezone] = useState("America/New_York");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(slugify(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalSlug = slug || slugify(name) || "my-business";

    // Navigate to tenant dashboard
    setTimeout(() => {
      router.push(`/dashboard`);
    }, 600);
  };

  const categories = [
    "Salon & Barber Shop",
    "Medical & Doctor",
    "Tutor & Education",
    "Lawyer & Legal",
    "Fitness & Health",
    "Freelancer & Agency",
    "Repair Service",
    "Other Service",
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />

      <Card className="w-full max-w-xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl relative z-10">
        <CardHeader>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 w-fit mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Organization Setup</span>
          </div>
          <CardTitle className="text-2xl font-bold">Create Your Organization</CardTitle>
          <CardDescription>Configure your business identity and custom booking page link.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Velvet & Blade Barbering"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Public Booking URL Slug *</label>
              <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-400">
                <span className="text-slate-400 font-mono text-xs">bookora.com/</span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="velvet-blade"
                  className="w-full bg-transparent text-white font-semibold font-mono text-sm focus:outline-none pl-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Business Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Primary Timezone *</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
              >
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>

            <div className="pt-4">
              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full gap-2">
                <span>{isSubmitting ? "Creating Organization..." : "Launch Organization Dashboard"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
