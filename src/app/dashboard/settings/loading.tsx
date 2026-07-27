import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-slate-800 rounded-xl" />
        <Skeleton className="h-4 w-72 bg-slate-800 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
    </div>
  );
}
