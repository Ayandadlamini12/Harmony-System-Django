import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getAccessRequests, getPatients } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function AccessRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getSessionUser();
  if (!session.signedIn) redirect("/login");

  const [params, patients, requests] = await Promise.all([
    searchParams,
    getPatients(),
    getAccessRequests()
  ]);
  const canRequest = session.role === "receptionist" || session.role === "admin";

  return (
    <AppShell title="Access requests" action={<Button asChild variant="secondary"><Link href="/patients/dashboard">Patient Hub</Link></Button>}>
      {params.created && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">Access request submitted.</div>}
      {params.error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{params.error}</div>}

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="hh-panel p-5">
          <h2 className="text-base font-bold">Request elevated access</h2>
          <p className="mt-2 text-sm leading-6 text-[#66736d]">
            Reception can request temporary access to confidential patient records. A clinician must approve the request before medical visits are visible.
          </p>
          {canRequest ? (
            <form action="/api/access-requests/create" method="post" className="mt-5 grid gap-4">
              <label>
                <span className="hh-label">Patient</span>
                <select className="hh-input" name="patient" required>
                  <option value="">Select patient</option>
                  {patients.results.map((patient) => (
                    <option key={patient.id} value={patient.id}>{patient.full_name_display} - {patient.patient_code}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="hh-label">Reason</span>
                <textarea className="hh-input min-h-28" name="reason" placeholder="Explain why temporary clinical access is needed." required />
              </label>
              <Button type="submit">Submit request</Button>
            </form>
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
