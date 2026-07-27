"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Calendar,
  Sparkles,
  User,
  ExternalLink,
  LogOut,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Menu,
  X,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ShareBookingModal } from "@/components/booking/share-booking-modal";

export function Navbar({ orgSlug }: { orgSlug?: string }) {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const user = session?.user;
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || "U";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg border border-slate-800 bg-slate-900/60 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-white">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-white via-slate-200 to-violet-300 bg-clip-text text-transparent">
                Bookora
              </span>
            </Link>
            {orgSlug && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                <Sparkles className="h-3 w-3" />
                {orgSlug}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {orgSlug && (
              <>
                <Button
                  onClick={() => setShareModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-violet-500/30 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Share & Embed</span>
                  <span className="sm:hidden">Share</span>
                </Button>
                <Link href={`/book/${orgSlug}`} target="_blank">
                  <Button variant="outline" size="sm" className="gap-2 border-slate-800 hover:bg-slate-800/80">
                    <span className="hidden sm:inline">View Public Page</span>
                    <span className="sm:hidden">View</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </>
            )}

            {status === "authenticated" && user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 rounded-full border border-slate-800 bg-slate-900/90 pl-1.5 pr-3 py-1 text-left text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "User Profile"}
                      className="h-7 w-7 rounded-full object-cover border border-violet-500/30"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                      {userInitials}
                    </div>
                  )}
                  <span className="max-w-[120px] truncate hidden md:inline">{user.name || user.email}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 z-50 rounded-xl border border-slate-800 bg-slate-900/95 backdrop-blur-xl p-3 shadow-2xl space-y-3">
                      <div className="px-2 py-1.5 border-b border-slate-800">
                        <p className="font-semibold text-sm text-white truncate">{user.name || "User Account"}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-[11px]">
                          {user.emailVerified ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle className="h-3 w-3" /> Email Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <AlertCircle className="h-3 w-3" /> Unverified Email
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <button
                          onClick={() => signOut({ callbackUrl: "/sign-in" })}
                          className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/sign-in">
                <Button variant="secondary" size="sm" className="gap-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-200 border border-violet-500/30">
                  <User className="h-4 w-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileNavOpen(false)}
          />
          {/* Mobile Drawer */}
          <div className="relative z-50 w-72 max-w-[85vw] bg-slate-950 border-r border-slate-800 shadow-2xl flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg text-white">Bookora</span>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg border border-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar orgSlug={orgSlug} onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
      {orgSlug && (
        <ShareBookingModal
          organizationSlug={orgSlug}
          organizationName={orgSlug.replace(/-/g, " ")}
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </>
  );
}
