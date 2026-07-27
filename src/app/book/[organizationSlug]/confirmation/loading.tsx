import { Skeleton } from "@/components/ui/skeleton";

export default function ConfirmationLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-16">
          <Skeleton className="h-4 w-40 bg-slate-800 rounded" />
          <Skeleton className="h-4 w-28 bg-slate-800 rounded" />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full bg-slate-800 mx-auto" />
            <Skeleton className="h-8 w-64 bg-slate-800 rounded-xl mx-auto" />
            <Skeleton className="h-4 w-96 bg-slate-800 rounded-lg mx-auto" />
          </div>
          <Skeleton className="h-64 w-full bg-slate-800 rounded-2xl" />
        </div>
      </main>
    </div>
  );
}
