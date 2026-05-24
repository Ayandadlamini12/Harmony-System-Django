import type { Metadata } from "next";
import { Suspense } from "react";

import { HarmonyToaster } from "@/components/harmony-toaster";
import { RouteProgress } from "@/components/route-progress";

import "./globals.css";

export const metadata: Metadata = {
  title: "Harmony Health System",
  description: "Django REST and Next.js redesign for Harmony Health",
  icons: {
    icon: "/brand/favicon-32.png",
    apple: "/brand/favicon-32.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {children}
        <HarmonyToaster />
      </body>
    </html>
  );
}
