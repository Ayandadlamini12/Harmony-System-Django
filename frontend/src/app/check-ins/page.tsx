import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getPatients } from "@/lib/api";

export default async function CheckInsPage() {
  const patients = await getPatients();

  return (
    <AppShell title="Check-in desk" action={<Button asChild variant="secondary"><Link href="/appointments">Appointments</Link></Button>}>
      <div className="hh-panel overflow-hidden">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Patient arrival queue</h2>
        </div>
        <div className="divide-y divide-[var(--hh-border)]">
          {patients.results.map((patient) => (
            <div key={patient.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <div className="font-bold">{patient.full_name_display}</div>
                <div className="font-mono text-xs text-[var(--hh-purple)]">{patient.patient_code}</div>
              </div>
              <Button asChild variant="secondary"><Link href={`/visits/new?patient=${patient.id}`}>Start visit</Link></Button>
            </div>
          ))}
          {patients.results.length === 0 && <div className="px-5 py-10 text-sm text-[#66736d]">No patients available for check-in.</div>}
        </div>
      </div>
    </AppShell>
  );
}
