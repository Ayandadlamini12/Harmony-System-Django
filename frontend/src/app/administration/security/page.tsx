import { ShieldAlert, KeyRound, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getSystemSecurityStatus } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { SecurityDashboardClient } from "./security-dashboard-client";

export default async function SecurityAndSessionsPage() {
  const [session, securityStatus] = await Promise.all([
    getSessionUser(),
    getSystemSecurityStatus(),
  ]);

  // Assert admin privilege - if not an admin, return dynamic 404 (Access Denied)
  if (session.role !== "admin") {
    notFound();
  }

  return (
    <AppShell title="Security & Sessions">
      <div className="space-y-6">
        {/* Header Block */}
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <KeyRound className="text-[var(--hh-purple)]" size={24} />
                <h2 className="text-xl font-bold text-[#3f1d58]">Security & Sessions</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#66736d]">
                Review operational security status, token lifespans, deployment environment contracts, and active identity provider configurations.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9e3dd] bg-white px-3 py-1 text-xs font-bold uppercase text-[#52635b] w-fit shrink-0">
              <ShieldCheck size={14} className="text-[#225c2c]" />
              Admin Only
            </span>
          </div>
        </div>

        {/* Auth Failure / Empty State Handler */}
        {!securityStatus ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-xs">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-lg text-red-950">Administrative Authorization Failed</h3>
                <p className="mt-2 text-sm leading-relaxed text-red-900">
                  The backend security status endpoint returned an unexpected authorization or connectivity failure.
                  Please ensure your administrator session is valid and try reloading the page.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <SecurityDashboardClient initialStatus={securityStatus} />
        )}
      </div>
    </AppShell>
  );
}
