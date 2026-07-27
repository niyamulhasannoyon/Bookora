import { Suspense } from "react";
import SignInPage from "../sign-in/page";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
      <SignInPage />
    </Suspense>
  );
}
