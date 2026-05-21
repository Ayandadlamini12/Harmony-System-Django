import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import { getPatient } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { CalendarCheck, Check, ClipboardList, Eye, HeartPulse, LockKeyhole, MoreHorizontal, Pencil, Printer, ShieldCheck, Stethoscope, UserRound, X } from "lucide-react";

const tabs = ["Overview", "Complaints", "Assessments", "Diagnosis", "Remedies", "Vitals", "Follow-ups", "Documents", "Notes"];

function value(text?: string | null) {
  return text || "--";
}

function formatDate(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(text));
}

function ageFromDate(date?: string | null) {
  if (!date) return "--";
  const dob = new Date(date);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age -= 1;
  return `${age} years`;
}

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSessionUser()]);

  const patient = await getPatient(id);
  if (!patient) notFound();

  const canCreateVisit = session.role === "admin" || session.role === "clinician";
  const clinicalAccessActive = patient.clinical_access === "active";
  const latestVisit = patient.visits?.[0];
  const vitals = latestVisit?.vitals;

  return (
    <AppShell title={patient.full_name_display}>
      <section className="overflow-hidden rounded-lg border border-[var(--hh-border)] bg-white shadow-sm">
        <div className="border-b border-[var(--hh-border)] bg-white px-4 py-5 sm:px-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
                <UserRound size={42} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-[var(--hh-purple-dark)]">{patient.full_name_display}</h1>
                  <span className="font-mono text-sm font-bold text-[#66736d]">{patient.patient_code}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#53605a]">
                  <span className="capitalize">{patient.gender.replaceAll("_", " ")}</span>
                  <span>{ageFromDate(patient.date_of_birth)}</span>
                  <span>{value(patient.primary_phone)}</span>
                  <span>{value(patient.town_or_locality || patient.region)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="green">{patient.status === "active" ? "Active patient" : patient.status}</Badge>
                  <Badge tone={clinicalAccessActive ? "purple" : "neutral"}>
                    {clinicalAccessActive ? "Clinician access active" : "Approval required"}
                  </Badge>
                  {latestVisit && <Badge tone="amber">Last visit {formatDate(latestVisit.visit_date)}</Badge>}
                </div>
              </div>
            </div>

            <aside className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8]">
              <div className="flex items-center justify-between border-b border-[var(--hh-border)] px-4 py-2">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ClipboardList size={17} />
                  Key notes
                </div>
                <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-white" type="button">
                  <Pencil size={15} />
                </button>
              </div>
              <p className="px-4 py-3 text-sm leading-6 text-[#3f4d47]">
                {patient.profile?.other_important_information || latestVisit?.main_complaint || "No key notes recorded yet."}
              </p>
            </aside>
          </div>
        </div>

        <div className="sticky top-16 z-10 border-b border-[var(--hh-border)] bg-white px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold ${
                  tab === "Overview"
                    ? "border-[var(--hh-purple)] text-[var(--hh-purple)]"
                    : "border-transparent text-[#3f4d47] hover:border-[var(--hh-border)] hover:text-[#111827]"
                }`}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[var(--hh-border)] bg-white px-4 py-3 sm:px-6">
          {canCreateVisit && (
            <Button asChild>
              <Link href={`/visits/new?patient=${patient.id}`}>
                <HeartPulse size={16} />
                New visit note
              </Link>
            </Button>
          )}
          <Button variant="secondary" type="button">
            <Printer size={16} />
            Print summary
          </Button>
          <Button variant="secondary" type="button">
            <CalendarCheck size={16} />
            Book follow-up
          </Button>
          <Button asChild variant="secondary">
            <Link href={clinicalAccessActive ? `/patients/${patient.id}/edit` : "/access-requests"}>
              <LockKeyhole size={16} />
              {clinicalAccessActive ? "Edit record" : "Request access"}
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-5 py-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-5">
          <Panel title="Patient details" icon={<UserRound size={17} />}>
            <InfoGrid
              rows={[
                ["Patient code", patient.patient_code],
                ["Date of birth", formatDate(patient.date_of_birth)],
                ["Primary phone", value(patient.primary_phone)],
                ["Locality", value(patient.town_or_locality || patient.region)],
                ["National ID", value(patient.national_id)],
                ["Status", patient.status]
              ]}
            />
          </Panel>

          <Panel title="Homeopathy profile" icon={<Stethoscope size={17} />}>
            {patient.profile ? (
              <InfoGrid
                rows={[
                  ["Past medical history", value(patient.profile.past_medical_history)],
                  ["Family medical history", value(patient.profile.family_medical_history)],
                  ["Allopathic medication", value(patient.profile.allopathic_medication)],
                  ["Children count", patient.profile.children_count?.toString() || "--"]
                ]}
              />
            ) : (
              <LockedClinicalNotice />
            )}
          </Panel>

          <Panel title="Latest vitals" icon={<HeartPulse size={17} />}>
            {vitals ? (
              <InfoGrid
                rows={[
                  ["Blood pressure", `${value(vitals.bp_first_reading)} / ${value(vitals.bp_second_reading)}`],
                  ["Pulse", vitals.pulse ? `${vitals.pulse} bpm` : "--"],
                  ["Temperature", vitals.temperature ? `${vitals.temperature} C` : "--"],
                  ["Weight", vitals.weight ? `${vitals.weight} kg` : "--"],
                  ["Respiration", vitals.resp_rate ? `${vitals.resp_rate} / min` : "--"],
                  ["Glucose", vitals.glucose_mmol_l ? `${vitals.glucose_mmol_l} mmol/L` : "--"],
                  ["Food type", value(vitals.glucose_food_type)],
                  ["Context", value(vitals.glucose_context?.replaceAll("_", " "))]
                ]}
              />
            ) : (
              <p className="text-sm text-[#66736d]">No vitals recorded yet.</p>
            )}
          </Panel>

          <ConfidentialRecords patient={patient} />
        </div>

        <div className="grid gap-5">
          <Panel title="History of present complaint" icon={<ClipboardList size={17} />} action>
            <div className="space-y-4 text-sm leading-6 text-[#3f4d47]">
              <p>{latestVisit?.initial_complaints || latestVisit?.main_complaint || "No complaint history recorded yet."}</p>
              {latestVisit?.physical_examination && <p>{latestVisit.physical_examination}</p>}
            </div>
          </Panel>

          <Panel title="Clinical assessment" icon={<Stethoscope size={17} />} action>
            {latestVisit ? (
              <InfoGrid
                rows={[
                  ["Main complaint", latestVisit.main_complaint],
                  ["Diagnosis", value(latestVisit.diagnosis)],
                  ["Remedy", value(latestVisit.remedy)],
                  ["Visit type", latestVisit.visit_type.replaceAll("_", " ")]
                ]}
              />
            ) : (
              <p className="text-sm text-[#66736d]">No visit assessment recorded yet.</p>
            )}
          </Panel>

          <Panel title="Visit timeline" icon={<ClipboardList size={17} />}>
            <div className="divide-y divide-[#eef2ef]">
              {patient.visits?.map((visit) => (
                <div key={visit.id} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[110px_1fr]">
                  <div className="text-xs font-bold uppercase text-[#66736d]">{formatDate(visit.visit_date)}</div>
                  <div>
                    <div className="font-bold capitalize">{visit.visit_type.replaceAll("_", " ")}</div>
                    <p className="mt-1 text-sm leading-6 text-[#53605a]">{visit.main_complaint}</p>
                  </div>
                </div>
              ))}
              {(!patient.visits || patient.visits.length === 0) && <p className="text-sm text-[#66736d]">No visit history visible.</p>}
            </div>
          </Panel>
        </div>
      </section>
    </AppShell>
  );
}

function ConfidentialRecords({ patient }: { patient: NonNullable<Awaited<ReturnType<typeof getPatient>>> }) {
  if (!patient.profile) {
    return (
      <Panel title="Confidential records" icon={<LockKeyhole size={17} />}>
        <LockedClinicalNotice />
      </Panel>
    );
  }

  return (
    <Panel title="Confidential records" icon={<LockKeyhole size={17} />}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[#e7d7ef] bg-[#f7f0fb] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-bold text-[var(--hh-purple-dark)]">Protected clinical information</div>
              <p className="mt-1 text-sm leading-6 text-[#53605a]">
                Sickness records, sensitive diagnosis notes, HIV status, and protected disclosures require elevated clinician authentication.
              </p>
            </div>
            <Button type="button">
              <Eye size={16} />
              View records
            </Button>
          </div>
        </div>
        <HivStatusCard status={patient.profile.hiv_status} />
        <ConditionSummary conditions={patient.conditions || []} />
      </div>
    </Panel>
  );
}

function ConditionSummary({ conditions }: { conditions: NonNullable<Awaited<ReturnType<typeof getPatient>>>["conditions"] }) {
  const conditionMap = new Map((conditions || []).map((condition) => [condition.condition_code, condition.present]));

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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
  return (
    <div className="rounded-lg border border-[#d8c0e8] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-[var(--hh-purple)]">
            <ShieldCheck size={15} />
            Confidential HIV status
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {["reactive", "non_reactive", "unknown"].map((option) => {
              const active = status === option;
              return (
                <span
                  className={`rounded-full border px-3 py-1 text-sm font-bold capitalize ${
                    active ? "border-[#bde5c4] bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]" : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                  key={option}
                >
                  {option.replaceAll("_", "-")}
                </span>
              );
            })}
          </div>
        </div>
        <span className="inline-flex min-h-9 items-center rounded-full border border-[#d8c0e8] bg-[#f7f0fb] px-3 text-xs font-bold uppercase text-[var(--hh-purple)]">
          Clinician access only
        </span>
      </div>
    </div>
  );
}

function LockedClinicalNotice() {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4 text-sm leading-6 text-[#66736d]">
      Clinical records are hidden until elevated access is approved.
    </div>
  );
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "purple" | "neutral" }) {
  const tones = {
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    purple: "border-[#e7d7ef] bg-[#f7f0fb] text-[var(--hh-purple)]",
    neutral: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

function Panel({ title, icon, children, action = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#eef2ef] px-4 py-3">
        <div className="flex items-center gap-2 font-bold">
          {icon}
          {title}
        </div>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-[#f7faf8]" type="button">
          {action ? <Pencil size={15} /> : <MoreHorizontal size={16} />}
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoGrid({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, text]) => (
        <div key={label}>
          <div className="text-xs font-bold uppercase text-[#66736d]">{label}</div>
          <div className="mt-1 text-sm capitalize text-[#1f2933]">{text}</div>
        </div>
      ))}
    </div>
  );
}
