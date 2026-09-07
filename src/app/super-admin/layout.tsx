import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldAlert,
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  ArrowLeft,
  Activity,
  ExternalLink,
} from "lucide-react";
import { requireSuperAdmin } from "@/lib/super-admin";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminUser = await requireSuperAdmin();

  const navLinks = [
    { name: "Overview", href: "/super-admin", icon: LayoutDashboard },
    { name: "Organizations", href: "/super-admin/organizations", icon: Building2 },
    { name: "Users", href: "/super-admin/users", icon: Users },
    { name: "Global Bookings", href: "/super-admin/bookings", icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500/30">
      {/* Super Admin Top Banner */}
      <header className="sticky top-0 z-50 w-full border-b border-amber-500/30 bg-slate-950/90 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-4">
            <Link href="/super-admin" className="flex items-center gap-2 font-black text-xl text-white">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-amber-400 via-rose-300 to-amber-200 bg-clip-text text-transparent">
                Bookora Super Admin
              </span>
            </Link>

            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-300 uppercase tracking-widest">
              <Activity className="h-3 w-3" /> Platform Control
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{adminUser.name || "System Admin"}</p>
              <p className="text-[11px] text-amber-400 font-mono">{adminUser.email}</p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Tenant Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center gap-1 px-4 sm:px-8 border-t border-slate-900 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-amber-400 hover:border-b-2 hover:border-amber-400 transition-all whitespace-nowrap"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
