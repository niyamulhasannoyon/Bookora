"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  Clock,
  Calendar as CalendarIcon,
  Users,
  UserCheck,
  Settings,
  CreditCard,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  orgSlug?: string;
  onNavigate?: () => void;
}

export function Sidebar({ orgSlug = "demo-salon", onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Overview",
      href: `/dashboard`,
      icon: LayoutDashboard,
    },
    {
      title: "Bookings",
      href: `/dashboard/bookings`,
      icon: CalendarDays,
    },
    {
      title: "Services",
      href: `/dashboard/services`,
      icon: Briefcase,
    },
    {
      title: "Availability",
      href: `/dashboard/availability`,
      icon: Clock,
    },
    {
      title: "Calendar",
      href: `/dashboard/calendar`,
      icon: CalendarIcon,
    },
    {
      title: "Customers",
      href: `/dashboard/customers`,
      icon: Users,
    },
    {
      title: "Team",
      href: `/dashboard/team`,
      icon: UserCheck,
    },
    {
      title: "Settings",
      href: `/dashboard/settings`,
      icon: Settings,
    },
    {
      title: "Billing",
      href: `/dashboard/billing`,
      icon: CreditCard,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/60 p-4 min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Dashboard Navigation
        </div>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-violet-600/30 to-indigo-600/20 text-white border border-violet-500/30 shadow-inner font-semibold"
                  : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-violet-400" : "text-slate-400")} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>

      <div className="glass-card rounded-xl p-4 border border-violet-500/20 bg-violet-950/20 mt-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
          <Share2 className="h-4 w-4 text-violet-400" />
          <span>Public Booking Page</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Share your link with clients to get booked instantly.
        </p>
        <Link
          href={`/${orgSlug}`}
          target="_blank"
          onClick={() => onNavigate?.()}
          className="block mt-3 text-xs font-medium text-violet-400 hover:underline truncate"
        >
          bookora.com/{orgSlug}
        </Link>
      </div>
    </aside>
  );
}
