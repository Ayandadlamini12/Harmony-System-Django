import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ClinicalPanel } from "@/components/clinical-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import { getPatient } from "@/lib/api";
import { relationshipLabel } from "@/lib/relationships";
import { getSessionUser } from "@/lib/session";
import { CalendarCheck, Check, ClipboardList, Eye, HeartPulse, LockKeyhole, Pencil, Printer, ShieldCheck, Stethoscope, UserRound, X } from "lucide-react";

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
  const vitals = patient.visits?.flatMap((visit) => visit.vitals || []).sort((a, b) => {
    const left = new Date(a.recorded_at || a.created_at || "").getTime();
    const right = new Date(b.recorded_at || b.created_at || "").getTime();
    return right - left;
  })[0];

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
                  <Badge variant="success">{patient.status === "active" ? "Active patient" : patient.status}</Badge>
                  <Badge variant={clinicalAccessActive ? "harmony" : "default"}>
                    {clinicalAccessActive ? "Clinician access active" : "Approval required"}
                  </Badge>
                  {latestVisit && <Badge variant="warning">Last visit {formatDate(latestVisit.visit_date)}</Badge>}
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
          <Tabs defaultValue="Overview">
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[var(--hh-border)] bg-white px-4 py-3 sm:px-6">
          {canCreateVisit && (
            <Button asChild>
              <Link className="!text-white" href={`/visits/new?patient=${patient.id}`}>
                <ClipboardList size={16} />
                New visit note
              </Link>
            </Button>
          )}
          {canCreateVisit && (
            <Button asChild variant="secondary">
              <Link href={`/vitals/new?patient=${patient.id}`}>
                <HeartPulse size={16} />
                Add vitals
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
          <Button variant="secondary" type="button">
            <LockKeyhole size={16} />
            Access log
          </Button>
        </div>
      </section>

      <section className="grid gap-5 py-5">
        <ClinicalPanel title="Patient details" icon={<UserRound size={17} />}>
          <InfoGrid
            rows={[
              ["Patient code", patient.patient_code],
              ["Date of birth", formatDate(patient.date_of_birth)],
              ["National / Passport ID", value(patient.national_id)],
              ["Primary phone", value(patient.primary_phone)],
              ["Email", value(patient.email)],
              ["Locality", value(patient.town_or_locality || patient.region)],
              ["Secondary phone", value(patient.secondary_phone)],
              ["Status", patient.status]
            ]}
          />
        </ClinicalPanel>

        <ClinicalPanel title="Next of kin" icon={<UserRound size={17} />}>
          <InfoGrid
            rows={[
              ["Full name(s)", value(patient.next_of_kin_full_name)],
              ["Relationship", value(relationshipLabel(patient.next_of_kin_relationship, patient.next_of_kin_relationship_other))],
              ["Phone", value(patient.next_of_kin_phone)],
              ["Email", value(patient.next_of_kin_email)]
            ]}
          />
        </ClinicalPanel>

        <ClinicalPanel title="Homeopathy profile" icon={<Stethoscope size={17} />}>
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
        </ClinicalPanel>

        <ClinicalPanel title="Latest vitals" icon={<HeartPulse size={17} />}>
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
                ["Context", value(vitals.glucose_context?.replaceAll("_", " "))],
                ["Recorded", formatDate(vitals.recorded_at)]
              ]}
            />
          ) : (
            <p className="text-sm text-[#66736d]">No vitals recorded yet.</p>
          )}
        </ClinicalPanel>

        <ConfidentialRecords patient={patient} />

        <ClinicalPanel title="History of present complaint" icon={<ClipboardList size={17} />} action>
          <div className="space-y-4 text-sm leading-6 text-[#3f4d47]">
            <p>{latestVisit?.initial_complaints || latestVisit?.main_complaint || "No complaint history recorded yet."}</p>
            {latestVisit?.physical_examination && <p>{latestVisit.physical_examination}</p>}
          </div>
        </ClinicalPanel>

        <ClinicalPanel title="Clinical assessment" icon={<Stethoscope size={17} />} action>
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
        </ClinicalPanel>

        <ClinicalPanel title="Visit timeline" icon={<ClipboardList size={17} />}>
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
        </ClinicalPanel>
      </section>
    </AppShell>
  );
}

function ConfidentialRecords({ patient }: { patient: NonNullable<Awaited<ReturnType<typeof getPatient>>> }) {
  if (!patient.profile) {
    return (
      <ClinicalPanel title="Confidential records" icon={<LockKeyhole size={17} />}>
        <LockedClinicalNotice />
      </ClinicalPanel>
    );
  }

  return (
    <ClinicalPanel title="Confidential records" icon={<LockKeyhole size={17} />}>
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
    </ClinicalPanel>
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
    <Card className="border-[#d8c0e8]">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
        <Badge className="min-h-9 px-3 uppercase" variant="harmony">
          Clinician access only
        </Badge>
      </CardContent>
    </Card>
  );
}

function LockedClinicalNotice() {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4 text-sm leading-6 text-[#66736d]">
      Clinical records are hidden until elevated access is approved.
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
