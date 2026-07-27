"use client";

import { useState } from "react";
import {
  Settings,
  Globe,
  Share2,
  Copy,
  Check,
  Building,
  Clock,
  Sparkles,
  Save,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";

import { ShareBookingModal } from "@/components/booking/share-booking-modal";

interface SettingsViewProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    bio?: string | null;
    logo?: string | null;
    timezone: string;
  };
}

export function SettingsView({ organization }: SettingsViewProps) {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [bio, setBio] = useState(organization.bio || "");
  const [timezone, setTimezone] = useState(organization.timezone || "America/New_York");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/book/${slug}`
    : `https://bookora.com/book/${slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Organization Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your business profile, timezone, public booking page, and sharing widget preferences.
        </p>
      </div>

      {/* Shareable Public Booking Link Banner */}
      <Card className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-indigo-950/60 border border-violet-500/30 shadow-xl">
        <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-violet-300">
              <Share2 className="h-4 w-4 text-violet-400" />
              <span>Public Booking Sharing & QR Embed</span>
            </div>
            <p className="text-xs text-slate-300">
              Generate QR codes, copy unique booking URLs, or copy iframe embed snippets for your site.
            </p>
            <div className="font-mono text-xs text-violet-400 font-semibold pt-1">
              {publicUrl}
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <Button
              onClick={() => setShareModalOpen(true)}
              size="sm"
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5 font-semibold"
            >
              <Share2 className="h-4 w-4" />
              <span>Share & QR & Embed</span>
            </Button>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              size="sm"
              className="border-violet-500/40 bg-violet-600/10 text-violet-200 hover:bg-violet-600/20 text-xs gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </Button>
            <Link href={`/book/${slug}`} target="_blank">
              <Button size="sm" variant="ghost" className="text-violet-300 hover:text-white text-xs gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <ShareBookingModal
        organizationSlug={slug}
        organizationName={name}
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Business Profile Settings */}
      <Card className="bg-slate-900/60 border border-slate-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Building className="h-5 w-5 text-violet-400" />
            Business Profile
          </CardTitle>
          <CardDescription>Update your public brand details displayed to clients.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Organization Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Business Bio / Description
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell clients about your services, experience, and lounge atmosphere..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Primary Business Timezone *
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="America/New_York">Eastern Time (US & Canada) - UTC-5</option>
                <option value="America/Chicago">Central Time (US & Canada) - UTC-6</option>
                <option value="America/Denver">Mountain Time (US & Canada) - UTC-7</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada) - UTC-8</option>
                <option value="Europe/London">London (GMT/BST) - UTC+0</option>
                <option value="Europe/Paris">Paris / Berlin - UTC+1</option>
                <option value="Asia/Tokyo">Tokyo - UTC+9</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {saved && (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="h-4 w-4" /> Profile settings saved!
                </span>
              )}
              <Button type="submit" className="ml-auto bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5">
                <Save className="h-4 w-4" />
                <span>Save Profile Settings</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
