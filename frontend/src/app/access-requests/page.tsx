import Link from "next/link";

import { AccessRequestForm } from "@/components/access-request-form";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getAccessRequests, getPatients } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function AccessRequestsPage() {
  const [session, patients, requests] = await Promise.all([
    getSessionUser(),
    getPatients(),
    getAccessRequests()
  ]);
  const canRequest = session.role === "receptionist" || session.role === "admin";

  return (
    <AppShell title="Access requests" action={<Button asChild variant="secondary"><Link href="/patients/dashboard">Patient Hub</Link></Button>}>
      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="hh-panel p-5">
          <h2 className="text-base font-bold">Request elevated access</h2>
          <p className="mt-2 text-sm leading-6 text-[#66736d]">
            Reception can request temporary access to confidential patient records. A clinician must approve the request before medical visits are visible.
          </p>
          {canRequest ? (
            <div className="mt-5">
              <AccessRequestForm patients={patients.results} />
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4 text-sm text-[#66736d]">
              Clinicians review requests on the Approvals page.
            </div>
          )}
        </div>

        <div className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border)] px-5 py-4">
            <h2 className="text-sm font-bold uppercase text-[#66736d]">Request history</h2>
          </div>
          <div className="divide-y divide-[var(--hh-border)]">
            {requests.results.map((request) => (
              <div key={request.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold">{request.patient_name || `Patient #${request.patient}`}</div>
                    <div className="font-mono text-xs text-[var(--hh-purple)]">{request.patient_code}</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold uppercase text-amber-700">{request.status}</span>
                </div>
                <p className="mt-2 text-sm text-[#66736d]">{request.reason || "No reason provided."}</p>
                {request.expires_at && <p className="mt-1 text-xs text-[#66736d]">Expires {new Date(request.expires_at).toLocaleString()}</p>}
              </div>
            ))}
            {requests.results.length === 0 && <div className="px-5 py-10 text-sm text-[#66736d]">No access requests yet.</div>}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
