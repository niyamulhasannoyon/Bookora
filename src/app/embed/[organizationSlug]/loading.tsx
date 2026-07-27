import { Skeleton } from "@/components/ui/skeleton";

export default function EmbedLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full bg-slate-800" />
        <Skeleton className="h-5 w-40 bg-slate-800 rounded" />
      </div>
      <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
      <Skeleton className="h-48 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
    </div>
  );
}
