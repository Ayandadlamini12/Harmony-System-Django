import { AppShell } from "@/components/app-shell";
import { VitalsForm } from "@/components/vitals-form";
import { getPatients, getVisits, getVitals } from "@/lib/api";

export default async function AddVitalsPage({ searchParams }: { searchParams: Promise<{ patient?: string; visit?: string }> }) {
  const params = await searchParams;
  const [patients, visits, vitals] = await Promise.all([getPatients(), getVisits(), getVitals()]);

  return (
    <AppShell title="Add vitals">
      <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="hh-panel p-5">
          <h2 className="font-bold">Record visit vitals</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
            Vitals are recorded separately from visit notes and linked to a specific visit with their own date and time. A visit can have multiple vitals records.
          </p>
        </div>
        <div className="hh-panel p-5">
          <div className="text-sm font-bold">Recent vitals records</div>
          <div className="mt-2 text-2xl font-bold text-[var(--hh-purple)]">{vitals.count}</div>
          <p className="mt-1 text-sm text-[#66736d]">Total records visible to your account.</p>
        </div>
      </section>

      <VitalsForm
        patientId={params.patient}
        patients={patients.results}
        visitId={params.visit}
        visits={visits.results}
      />
    </AppShell>
  );
}
