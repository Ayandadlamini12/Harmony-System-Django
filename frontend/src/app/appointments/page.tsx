import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getPatients } from "@/lib/api";

export default async function AppointmentsPage() {
  const patients = await getPatients();

  return (
    <AppShell title="Appointments" action={<Button asChild><Link href="/check-ins">Open check-ins</Link></Button>}>
      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border)] px-5 py-4">
            <h2 className="text-sm font-bold uppercase text-[#66736d]">Today&apos;s appointment board</h2>
          </div>
          <div className="divide-y divide-[var(--hh-border)]">
            {patients.results.slice(0, 6).map((patient) => (
              <div key={patient.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="font-bold">{patient.full_name_display}</div>
                  <div className="text-sm text-[#66736d]">{patient.primary_phone || "No phone"} · {patient.patient_code}</div>
                </div>
                <span className="rounded-full bg-[#f5edfa] px-2 py-1 text-xs font-bold text-[var(--hh-purple)]">Scheduled</span>
              </div>
            ))}
            {patients.results.length === 0 && <div className="px-5 py-10 text-sm text-[#66736d]">No appointments are scheduled yet.</div>}
          </div>
        </div>
        <div className="hh-panel p-5">
          <h2 className="font-bold">Appointment workflow</h2>
          <p className="mt-2 text-sm leading-6 text-[#66736d]">
            This screen is now wired into navigation. The next backend slice will add real appointment booking, arrival status, and clinician assignment.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
