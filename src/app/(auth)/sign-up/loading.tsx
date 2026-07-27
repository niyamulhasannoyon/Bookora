import { Skeleton } from "@/components/ui/skeleton";

export default function SignUpLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center mb-6">
          <Skeleton className="h-12 w-12 rounded-2xl bg-slate-800" />
        </div>
        <Skeleton className="h-8 w-64 mx-auto bg-slate-800 rounded-xl" />
        <Skeleton className="h-4 w-72 mx-auto bg-slate-800 rounded-lg" />
        <Skeleton className="h-12 w-full bg-slate-800 rounded-xl mt-4" />
        <div className="flex items-center gap-3 my-4">
          <Skeleton className="h-px flex-1 bg-slate-800" />
          <Skeleton className="h-4 w-40 bg-slate-800 rounded" />
          <Skeleton className="h-px flex-1 bg-slate-800" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full bg-slate-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
