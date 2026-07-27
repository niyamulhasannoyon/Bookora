import { Building2, Link as LinkIcon, Save, Copy } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Sidebar } from "@/components/sidebar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar orgSlug={orgSlug} />
      <div className="flex">
        <Sidebar orgSlug={orgSlug} />
        <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Organization Settings</h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage your public branding, business timezone, and booking URLs.
              </p>
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </Button>
          </div>

          <div className="space-y-6 max-w-3xl">
            {/* Shareable Link Card */}
            <Card className="bg-gradient-to-r from-violet-950/40 to-indigo-950/40 border border-violet-500/30">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-violet-300">
                  <LinkIcon className="h-5 w-5" />
                  <span>Public Booking Link</span>
                </CardTitle>
                <CardDescription>Share this URL with clients via Instagram bio, WhatsApp, or website.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    readOnly
                    value={`https://bookora.com/${orgSlug}`}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
                  />
                  <Button variant="secondary" className="gap-2">
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profile Settings */}
            <Card className="bg-slate-900/60 border border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl">Business Profile Details</CardTitle>
                <CardDescription>Public info displayed to your booking customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Organization Name</label>
                  <input
                    type="text"
                    defaultValue={orgSlug.replace(/-/g, " ")}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Business Bio / Intro</label>
                  <textarea
                    rows={3}
                    defaultValue="Premium service professional offering luxury haircuts, styling, and personal care appointments."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Primary Timezone</label>
                  <select
                    defaultValue="America/New_York"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Chicago">Central Time (US & Canada)</option>
                    <option value="America/Denver">Mountain Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
