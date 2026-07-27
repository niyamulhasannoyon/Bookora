import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 bg-slate-800 rounded-xl" />
        <Skeleton className="h-4 w-96 bg-slate-800 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 bg-slate-900/60 border border-slate-800 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
    </div>
  );
}
