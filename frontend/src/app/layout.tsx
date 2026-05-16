import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harmony Health System",
  description: "Django REST and Next.js redesign for Harmony Health"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
