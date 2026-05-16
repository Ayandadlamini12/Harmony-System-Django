import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getAccessRequests } from "@/lib/api";

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [params, requests] = await Promise.all([searchParams, getAccessRequests()]);
  const pending = requests.results.filter((request) => request.status === "pending");

  return (
    <AppShell title="Approvals" action={<Button asChild variant="secondary"><Link href="/patients/dashboard">Patient Hub</Link></Button>}>
      {params.approved && <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">Access request approved.</div>}
      {params.rejected && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Access request rejected.</div>}
      {params.error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{params.error}</div>}

      <div className="hh-panel overflow-hidden">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Pending elevated access requests</h2>
        </div>
        <div className="divide-y divide-[var(--hh-border)]">
          {pending.map((request) => (
            <div key={request.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{request.patient_name || `Patient #${request.patient}`}</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold uppercase text-amber-700">{request.status}</span>
                </div>
                <div className="mt-1 font-mono text-xs text-[var(--hh-purple)]">{request.patient_code}</div>
                <p className="mt-2 text-sm leading-6 text-[#66736d]">{request.reason || "No reason provided."}</p>
                <p className="mt-2 text-xs text-[#66736d]">Requested by {request.requested_by_name || "Reception"}</p>
              </div>
              <div className="grid gap-3">
                <form action={`/api/access-requests/${request.id}/approve`} method="post" className="grid gap-2">
                  <input className="hh-input" name="hours" type="number" min="1" max="24" defaultValue="4" aria-label="Approval hours" />
                  <input className="hh-input" name="review_note" placeholder="Approval note" />
                  <Button type="submit">Approve</Button>
                </form>
                <form action={`/api/access-requests/${request.id}/reject`} method="post" className="grid gap-2">
                  <input className="hh-input" name="review_note" placeholder="Rejection note" />
                  <Button type="submit" variant="secondary">Reject</Button>
                </form>
              </div>
            </div>
          ))}
          {pending.length === 0 && <div className="px-5 py-10 text-sm text-[#66736d]">No pending approvals.</div>}
        </div>
      </div>
    </AppShell>
  );
}
