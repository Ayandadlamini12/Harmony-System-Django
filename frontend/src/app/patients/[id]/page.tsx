import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getPatient } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

function value(text?: string | null) {
  return text || "--";
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSessionUser()]);

  const patient = await getPatient(id);
  if (!patient) notFound();

  const canCreateVisit = session.role === "admin" || session.role === "clinician";
  const clinicalAccessActive = patient.clinical_access === "active";

  return (
    <AppShell
      title={patient.full_name_display}
      action={
        <>
          <Button asChild variant="secondary"><Link href="/patients">Back to directory</Link></Button>
          <Button asChild variant="secondary"><Link href={`/patients/${patient.id}/edit`}>Edit record</Link></Button>
          {canCreateVisit && <Button asChild><Link href={`/visits/new?patient=${patient.id}`}>Add visit</Link></Button>}
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="hh-panel p-5">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Personal record</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Info label="Patient code" value={patient.patient_code} />
            <Info label="National ID" value={value(patient.national_id)} />
            <Info label="Date of birth" value={value(patient.date_of_birth)} />
            <Info label="Gender" value={patient.gender.replaceAll("_", " ")} />
            <Info label="Primary phone" value={value(patient.primary_phone)} />
            <Info label="Region" value={value(patient.region)} />
            <Info label="Town / locality" value={value(patient.town_or_locality)} />
            <Info label="Village" value={value(patient.village)} />
          </div>
        </div>

        <div className="hh-panel p-5">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Access status</h2>
          <div className="mt-4 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
            <div className="font-bold">{clinicalAccessActive ? "Clinical access active" : "Approval required"}</div>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">
              {clinicalAccessActive
                ? "You can view visits, medical history, conditions, and follow-up notes for this patient."
                : "This role can manage the non-confidential record. Medical details require approved elevated access."}
            </p>
          </div>
          {!clinicalAccessActive && (
            <Button asChild className="mt-4 w-full"><Link href="/access-requests">Request access</Link></Button>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="hh-panel p-5">
          <h2 className="font-bold">Clinical profile</h2>
          {patient.profile ? (
            <div className="mt-4 grid gap-4">
              <Info label="HIV status" value={patient.profile.hiv_status.replaceAll("_", " ")} />
              <Info label="Past medical history" value={value(patient.profile.past_medical_history)} />
              <Info label="Family medical history" value={value(patient.profile.family_medical_history)} />
              <Info label="Allopathic medication" value={value(patient.profile.allopathic_medication)} />
              <Info label="Other important information" value={value(patient.profile.other_important_information)} />
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#66736d]">Clinical profile is hidden until access is approved.</p>
          )}
        </div>

        <div className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border)] px-5 py-4">
            <h2 className="font-bold">Visit history</h2>
          </div>
          <div className="divide-y divide-[var(--hh-border)]">
            {patient.visits?.map((visit) => (
              <div key={visit.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-bold">{visit.visit_date}</div>
                  <span className="rounded-full bg-[#f5edfa] px-2 py-1 text-xs font-bold text-[var(--hh-purple)]">{visit.visit_type.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-2 text-sm text-[#66736d]">{visit.main_complaint}</p>
              </div>
            ))}
            {(!patient.visits || patient.visits.length === 0) && (
              <div className="px-5 py-8 text-sm text-[#66736d]">No visit history visible.</div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase text-[#66736d]">{label}</div>
      <div className="mt-1 capitalize">{value}</div>
    </div>
  );
}
