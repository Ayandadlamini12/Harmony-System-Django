import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getVisits } from "@/lib/api";

export default async function WaitingListPage() {
  const visits = await getVisits();

  return (
    <AppShell title="Waiting list" action={<Button asChild><Link href="/check-ins">Check in patient</Link></Button>}>
      <div className="hh-panel overflow-hidden">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Patients waiting to be seen</h2>
        </div>
        <div className="divide-y divide-[var(--hh-border)]">
          {visits.results.slice(0, 8).map((visit) => (
            <div key={visit.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <div className="font-bold">{visit.patient_name || "Unknown patient"}</div>
                <div className="text-sm text-[#66736d]">{visit.main_complaint}</div>
              </div>
              <span className="rounded-full bg-[#d1f5de] px-2 py-1 text-xs font-bold text-[#0a7a35]">Ready for clinician</span>
            </div>
          ))}
          {visits.results.length === 0 && <div className="px-5 py-10 text-sm text-[#66736d]">No patients are waiting yet. Check-in status will be fully backed by appointments next.</div>}
        </div>
      </div>
    </AppShell>
  );
}
