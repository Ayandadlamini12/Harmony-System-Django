import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Check, ShieldCheck, X } from "lucide-react";
import { getPatient } from "@/lib/api";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
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
            <>
              <div className="mt-4 grid gap-4">
                <HivStatusCard status={patient.profile.hiv_status} />
                <Info label="Past medical history" value={value(patient.profile.past_medical_history)} />
                <Info label="Family medical history" value={value(patient.profile.family_medical_history)} />
                <Info label="Allopathic medication" value={value(patient.profile.allopathic_medication)} />
                <Info label="Other important information" value={value(patient.profile.other_important_information)} />
              </div>
              <div className="mt-5 border-t border-[var(--hh-border)] pt-5">
                <h3 className="text-sm font-bold uppercase text-[#66736d]">Confidential sickness records</h3>
                <ConditionSummary conditions={patient.conditions || []} />
              </div>
            </>
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

function ConditionSummary({ conditions }: { conditions: NonNullable<Awaited<ReturnType<typeof getPatient>>>["conditions"] }) {
  const conditionMap = new Map((conditions || []).map((condition) => [condition.condition_code, condition.present]));

  return (
    <div className="mt-4 grid gap-2 md:grid-cols-2">
      {CONFIDENTIAL_CONDITIONS.map((condition) => {
        const present = conditionMap.get(condition.code) ?? false;
        return (
          <div key={condition.code} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--hh-border)] bg-white px-3 py-2">
            <span className="text-sm font-semibold">{condition.label}</span>
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                present ? "bg-[var(--hh-green)] text-white" : "bg-slate-100 text-slate-600"
              }`}
              aria-label={present ? "Yes" : "No"}
            >
              {present ? <Check size={17} /> : <X size={17} />}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HivStatusCard({ status }: { status: string }) {
  const label = status.replaceAll("_", " ");

  return (
    <div className="rounded-lg border border-[#e7d7ef] bg-[#f7f0fb] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--hh-purple)]">
            <ShieldCheck size={15} />
            Confidential HIV status
          </div>
          <div className="mt-2 text-lg font-bold capitalize text-[var(--hh-purple-dark)]">{label}</div>
        </div>
        <span className="inline-flex min-h-9 items-center rounded-full border border-[#d8c0e8] bg-white px-3 text-xs font-bold uppercase text-[var(--hh-purple)]">
          Clinician access only
        </span>
      </div>
    </div>
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
