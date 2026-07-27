import Link from "next/link";
import { CheckCircle2, Calendar, Clock, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const orgName = orgSlug.replace(/-/g, " ");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[160px] pointer-events-none" />

      <Card className="w-full max-w-lg border border-slate-800 bg-slate-900/90 backdrop-blur-xl relative z-10 text-center">
        <CardHeader>
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-extrabold">Booking Confirmed!</CardTitle>
          <CardDescription className="text-slate-300 mt-1">
            Your appointment with <strong className="capitalize text-white">{orgName}</strong> is reserved.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-2xl text-left space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Appointment Summary</div>
            <div className="text-lg font-bold text-white">Signature Haircut & Styling</div>
            <div className="flex items-center gap-2 text-sm text-violet-300">
              <Calendar className="h-4 w-4" />
              <span>Tomorrow at 2:00 PM (45 mins)</span>
            </div>
            <p className="text-xs text-slate-400">
              A confirmation email with calendar event invites has been dispatched to your inbox.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" className="flex-1 gap-2">
              <Download className="h-4 w-4 text-violet-400" />
              <span>Add to Google / iCal</span>
            </Button>
            <Link href={`/${orgSlug}`} className="flex-1">
              <Button className="w-full gap-2">
                <span>Done</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
