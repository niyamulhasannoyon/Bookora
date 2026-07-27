import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: {
    default: "Bookora — Multi-Tenant Booking & Appointment SaaS",
    template: "%s | Bookora",
  },
  description:
    "All-in-one multi-tenant appointment scheduling platform with Google Calendar sync, Stripe payments, and automated email notifications.",
  keywords: [
    "appointment booking",
    "scheduling software",
    "multi-tenant SaaS",
    "Google Calendar sync",
    "Stripe payments",
  ],
  authors: [{ name: "Bookora" }],
  creator: "Bookora",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Bookora",
    title: "Bookora — Multi-Tenant Booking & Appointment SaaS",
    description:
      "All-in-one multi-tenant appointment scheduling platform with Google Calendar sync, Stripe payments, and automated email notifications.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bookora — Multi-Tenant Booking & Appointment SaaS",
    description:
      "All-in-one multi-tenant appointment scheduling platform with Google Calendar sync, Stripe payments, and automated email notifications.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className={`bg-slate-950 text-slate-100 antialiased selection:bg-violet-500/30 selection:text-white ${inter.className}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

