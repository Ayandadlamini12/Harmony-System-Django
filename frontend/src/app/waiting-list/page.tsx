import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getCheckIns } from "@/lib/api";

export default async function WaitingListPage() {
  const checkIns = await getCheckIns("waiting");
  const waiting = checkIns.results;

  return (
    <AppShell title="Waiting list" action={<Button asChild><Link href="/check-ins">Check in patient</Link></Button>}>
      <div className="hh-panel overflow-hidden">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Patients waiting to be seen</h2>
        </div>
        <div className="divide-y divide-[var(--hh-border)]">
          {waiting.slice(0, 12).map((checkIn) => (
            <div key={checkIn.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <div className="font-bold">{checkIn.patient_name || "Unknown patient"}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-[#66736d]">
                  <span className="font-mono text-[var(--hh-purple)]">{checkIn.patient_code}</span>
                  <span>{checkIn.visit_type.replaceAll("_", " ")}</span>
                  <span>{new Date(checkIn.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="capitalize">{checkIn.method}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--hh-green-light)] px-2 py-1 text-xs font-bold text-[var(--hh-green-dark)]">Waiting</span>
                <Button asChild size="sm">
                  <Link href={`/visits/new?patient=${checkIn.patient}&type=${checkIn.visit_type}`}>Start visit</Link>
                </Button>
              </div>
            </div>
          ))}
          {waiting.length === 0 && <div className="px-5 py-10 text-sm text-[#66736d]">No patients are waiting yet. Use the check-in desk or tablet view when a patient arrives.</div>}
        </div>
      </div>
    </AppShell>
  );
}
