import { Skeleton } from "@/components/ui/skeleton";

export default function NewServiceLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 bg-slate-800 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-slate-800 rounded-xl" />
          <Skeleton className="h-4 w-72 bg-slate-800 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
          <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
          <Skeleton className="h-24 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
          <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
        </div>
        <Skeleton className="h-96 bg-slate-900/60 border border-slate-800 rounded-2xl" />
      </div>
    </div>
  );
}
