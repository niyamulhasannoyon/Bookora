import { Skeleton } from "@/components/ui/skeleton";

export default function PublicBookingLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl bg-slate-800" />
            <Skeleton className="h-5 w-32 bg-slate-800 rounded" />
          </div>
          <Skeleton className="h-4 w-28 bg-slate-800 rounded" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <Skeleton className="h-48 w-full rounded-3xl bg-slate-900/60 border border-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-16 w-full rounded-2xl bg-slate-900/60 border border-slate-800" />
            <Skeleton className="h-64 w-full rounded-2xl bg-slate-900/60 border border-slate-800" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-2xl bg-slate-900/60 border border-slate-800" />
            <Skeleton className="h-32 w-full rounded-2xl bg-slate-900/60 border border-slate-800" />
          </div>
        </div>
      </main>
    </div>
  );
}
