import { Skeleton } from "@/components/ui/skeleton";

export default function AcceptInviteLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Skeleton className="h-64 w-full bg-slate-900/60 border border-slate-800 rounded-2xl" />
      </div>
    </div>
  );
}
