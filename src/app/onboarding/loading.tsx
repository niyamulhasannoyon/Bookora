import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <Skeleton className="h-8 w-48 bg-slate-800 rounded-xl mx-auto" />
        <Skeleton className="h-4 w-72 bg-slate-800 rounded-lg mx-auto" />
        <div className="space-y-4 mt-8">
          <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
          <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
          <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
          <Skeleton className="h-12 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
        </div>
        <Skeleton className="h-14 w-full bg-slate-900/60 border border-slate-800 rounded-2xl mt-4" />
      </div>
    </div>
  );
}
