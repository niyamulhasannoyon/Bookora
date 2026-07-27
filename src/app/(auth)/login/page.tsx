// This file is intentionally removed. Use "sign-in" route instead.
import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/sign-in");
}