"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Check, ClipboardList, Download, Eye, FileText, HeartPulse, ListChecks, LockKeyhole, PenLine, Printer, ShieldCheck, Stethoscope, UserRound, X } from "lucide-react";
import SignaturePad from "signature_pad";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ActionErrorDialog } from "@/components/action-error-dialog";
import { ClinicalPanel } from "@/components/clinical-panel";
import { PatientAppointmentDialog } from "@/components/patient-appointment-dialog";
import { PatientMedicalHistoryDialog } from "@/components/patient-medical-history-dialog";
import { PatientVitalsDialog } from "@/components/patient-vitals-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import { relationshipLabel } from "@/lib/relationships";
import type { Case, Patient, PatientDocument, PatientProfile, PatientWorkflowAction, Visit, Vital } from "@/types/clinic";

const recordTabs = [
  { key: "overview", label: "Overview" },
  { key: "cases", label: "Cases" },
  { key: "assessments", label: "Assessments" },
  { key: "diagnosis", label: "Diagnosis" },
  { key: "remedies", label: "Remedies" },
  { key: "vitals", label: "Vitals" },
  { key: "follow_ups", label: "Follow-ups" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" }
] as const;

type RecordTab = (typeof recordTabs)[number]["key"];

function value(text?: string | null) {
  return text || "--";
}

function formatDate(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(text));
}

function formatDateTime(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(text));
}

function allVitals(patient: Patient) {
  return (patient.visits || [])
    .flatMap((visit) => (visit.vitals || []).map((vital) => ({ ...vital, visitLabel: `${visit.visit_date} - ${visit.visit_type.replaceAll("_", " ")}` })))
    .sort((a, b) => new Date(b.recorded_at || b.created_at || "").getTime() - new Date(a.recorded_at || a.created_at || "").getTime());
}

function disabledWorkflowButton(action: PatientWorkflowAction | undefined, icon: ReactNode, label: string) {
  return (
    <Button variant="secondary" type="button" disabled title={action?.reason || "This action is not available yet."}>
      {icon}
      {label}
    </Button>
  );
}

export function PatientRecordWorkspace({ patient, canCreateVisit, initialCases }: { patient: Patient; canCreateVisit: boolean; initialCases: Case[] }) {
  const [activeTab, setActiveTab] = useState<RecordTab>("overview");
  const [profile, setProfile] = useState(patient.profile);
  const [documents, setDocuments] = useState(patient.documents || []);
  const latestVisit = patient.visits?.[0];
  const latestVitals = allVitals(patient)[0];
  const consentSigned = documents.some((d) => d.document_type === "consent_form" && (d.status === "signed" || d.status === "verified"));
  const workflowActions = patient.patient_actions || [];
  const actionFor = (key: PatientWorkflowAction["key"]) => workflowActions.find((action) => action.key === key);
  const consentAction = actionFor("consent_forms");
  const checkInAction = actionFor("check_in");
  const historyAction = actionFor("medical_history");
  const confidentialAction = actionFor("confidential_records");
  const vitalsAction = actionFor("vitals");
  const visitAction = actionFor("visits");
  const nextAction = workflowActions.find((action) => action.next);

  return (
    <>
      <div className="sticky top-16 z-10 border-b border-[var(--hh-border)] bg-white px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {recordTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? "border-[var(--hh-purple)] text-[var(--hh-purple)]"
                  : "border-transparent text-[#3f4d47] hover:border-[var(--hh-border)] hover:text-[#111827]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--hh-border)] bg-white px-4 py-3 sm:px-6">
        {nextAction && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-[#d9e3dd] bg-[#f7faf8] px-4 py-2 text-sm text-[#475951]">
            <ListChecks size={16} className="text-[var(--hh-purple)]" />
            Next step: <span className="font-semibold text-[var(--hh-purple-dark)]">{nextAction.label}</span>
          </div>
        )}
        {!consentSigned && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-4 py-2 text-sm text-[#92400e]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Complete consent form before clinical work
          </div>
        )}
        {consentAction?.enabled ? (
          <Button variant="secondary" type="button" onClick={() => setActiveTab("documents")}>
            <FileText size={16} />
            {consentAction.completed ? "Consent form" : "Sign consent"}
          </Button>
        ) : (
          disabledWorkflowButton(consentAction, <FileText size={16} />, "Consent form")
        )}
        {checkInAction?.enabled ? (
          <Button asChild variant="secondary">
            <Link href={checkInAction.href || "/check-ins"}>
              <ListChecks size={16} />
              {checkInAction.completed ? "Patient checked in" : "Check in / queue"}
            </Link>
          </Button>
        ) : (
          disabledWorkflowButton(checkInAction, <ListChecks size={16} />, "Check in / queue")
        )}
        {canCreateVisit && visitAction?.enabled ? (
          <Button asChild>
            <Link className="!text-white" href={`/visits/new?patient=${patient.id}`}>
              <ClipboardList size={16} />
              New visit
            </Link>
          </Button>
        ) : (
          disabledWorkflowButton(visitAction, <ClipboardList size={16} />, "New visit")
        )}
        {canCreateVisit && historyAction?.enabled ? (
          <PatientMedicalHistoryDialog patient={{ ...patient, profile }} onSaved={(p) => setProfile(p)} />
        ) : (
          disabledWorkflowButton(historyAction, <HeartPulse size={16} />, "Medical history")
        )}
        {canCreateVisit && confidentialAction?.enabled ? (
          <Button variant="secondary" type="button" onClick={() => setActiveTab("overview")}>
            <ShieldCheck size={16} />
            Confidential records
          </Button>
        ) : (
          disabledWorkflowButton(confidentialAction, <ShieldCheck size={16} />, "Confidential records")
        )}
        {canCreateVisit && vitalsAction?.enabled ? <PatientVitalsDialog patient={patient} /> : disabledWorkflowButton(vitalsAction, <HeartPulse size={16} />, "Add vitals")}
        <Button variant="secondary" type="button">
          <Printer size={16} />
          Print summary
        </Button>
        <PatientAppointmentDialog patient={patient} />
        <Button variant="secondary" type="button">
          <LockKeyhole size={16} />
          Access log
        </Button>
      </div>

      <section className="grid gap-5 py-5">
        {activeTab === "overview" && <OverviewTab patient={patient} latestVisit={latestVisit} latestVitals={latestVitals} profile={profile} />}
        {activeTab === "cases" && <CasesTab patientId={patient.id} initialCases={initialCases} />}
        {activeTab === "assessments" && <AssessmentsTab visits={patient.visits || []} cases={initialCases} />}
        {activeTab === "diagnosis" && <DiagnosisTab visits={patient.visits || []} cases={initialCases} clinicalAccess={patient.clinical_access} />}
        {activeTab === "remedies" && <RemediesTab visits={patient.visits || []} cases={initialCases} />}
        {activeTab === "vitals" && <VitalsTab vitals={allVitals(patient)} />}
        {activeTab === "follow_ups" && <FollowUpsTab visits={patient.visits || []} cases={initialCases} />}
        {activeTab === "documents" && <DocumentsTab patient={patient} documents={documents} onDocumentsChange={setDocuments} />}
        {activeTab === "notes" && <NotesTab patient={patient} latestVisit={latestVisit} profile={profile} />}
      </section>
    </>
  );
}

function OverviewTab({ patient, latestVisit, latestVitals, profile }: { patient: Patient; latestVisit?: Visit; latestVitals?: Vital & { visitLabel: string }; profile?: PatientProfile | null }) {
  return (
    <>
      <PatientJourneyPanel patient={patient} />
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
        {profile ? (
          <InfoGrid
            rows={[
              ["Past medical history", value(profile.past_medical_history)],
              ["Family medical history", value(profile.family_medical_history)],
              ["Allopathic medication", value(profile.allopathic_medication)],
              ["Children count", profile.children_count?.toString() || "--"]
            ]}
          />
        ) : (
          <LockedClinicalNotice />
        )}
      </ClinicalPanel>
      <LatestVitalsPanel vitals={latestVitals} />
      <ConfidentialRecords patient={patient} profile={profile} />
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
      <VisitTimeline visits={patient.visits || []} />
    </>
  );
}

function PatientJourneyPanel({ patient }: { patient: Patient }) {
  const journey = patient.current_journey;
  return (
    <ClinicalPanel title="Patient process today" icon={<ListChecks size={17} />}>
      {journey ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-3">
            <ProcessMetric label="Stage" value={journey.current_stage_label} />
            <ProcessMetric label="Flow" value={journey.flow_type_label} />
            <ProcessMetric label="Queue" value={journey.queue_number ? `#${journey.queue_number}` : journey.appointment_matched ? "Appointment" : "--"} />
          </div>
          <Button asChild variant="secondary">
            <Link href={`/patient-flow?identifier=${encodeURIComponent(patient.patient_code)}`}>Track full flow</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="text-sm leading-6 text-[#66736d]">No active establishment process has been started for this patient today.</p>
          <Button asChild variant="secondary">
            <Link href="/check-ins">Check in patient</Link>
          </Button>
        </div>
      )}
    </ClinicalPanel>
  );
}

function CasesTab({ patientId, initialCases }: { patientId: number; initialCases: Case[] }) {
  const [cases, setCases] = useState<Case[]>(initialCases || []);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  async function resolveCase(caseItem: Case) {
    setResolvingId(caseItem.id);
    try {
      const res = await fetch(`/api/cases/${caseItem.id}/resolve/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const ids: number[] = data.resolved_ids || [caseItem.id];
      setCases((prev) =>
        prev.map((c) =>
          ids.includes(c.id) ? { ...c, status: "resolved" as const } : c
        )
      );
      toast.success("Case resolved");
    } catch {
      toast.error("Could not resolve case");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <ClinicalPanel title="Patient cases" icon={<ClipboardList size={17} />}>
      {cases.length === 0 ? (
        <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-6 text-center">
          <p className="text-sm font-bold text-[#66736d]">No cases recorded yet</p>
          <p className="mt-1 text-sm leading-6 text-[#66736d]">Click "New Case" above to create the first clinical case for this patient.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--hh-border)]">
          {cases.map((caseItem) => {
            const isExpanded = expandedId === caseItem.id;
            return (
              <div key={caseItem.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-bold hover:text-[var(--hh-purple)]"
                        onClick={() => setExpandedId(isExpanded ? null : caseItem.id)}
                      >
                        {caseItem.title}
                      </button>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        caseItem.status === "open"
                          ? "bg-[#fef3c7] text-[#92400e]"
                          : "bg-[#d1fae5] text-[#065f46]"
                      }`}>
                        {caseItem.status}
                      </span>
                      {caseItem.parent_case && (
                        <span className="inline-flex items-center rounded-full bg-[#e0e7ff] px-2 py-0.5 text-xs font-bold uppercase text-[#3730a3]">
                          Follow-up
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#66736d]">
                      <span>{formatDate(caseItem.visit_date || caseItem.created_at)}</span>
                      {caseItem.patient_name && <span>Patient: {caseItem.patient_name}</span>}
                      {caseItem.diagnosis && <span>Diagnosis: {caseItem.diagnosis}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {caseItem.status === "open" && (
                      <>
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/visits/new?patient=${patientId}&type=follow_up`}>
                            Follow-up
                          </Link>
                        </Button>
                        {!caseItem.parent_case && (
                          <Button size="sm" onClick={() => resolveCase(caseItem)} disabled={resolvingId === caseItem.id}>
                            {resolvingId === caseItem.id ? "..." : "Resolve"}
                          </Button>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-white"
                      onClick={() => setExpandedId(isExpanded ? null : caseItem.id)}
                    >
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 grid gap-3 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {caseItem.main_complaint && (
                        <div>
                          <div className="text-xs font-bold uppercase text-[#66736d]">Main complaint</div>
                          <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.main_complaint}</div>
                        </div>
                      )}
                      {caseItem.physical_examination && (
                        <div>
                          <div className="text-xs font-bold uppercase text-[#66736d]">Physical examination</div>
                          <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.physical_examination}</div>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {caseItem.diagnosis && (
                        <div>
                          <div className="text-xs font-bold uppercase text-[#66736d]">Diagnosis</div>
                          <div className="mt-0.5 text-sm font-bold text-[#1f2933]">{caseItem.diagnosis}</div>
                        </div>
                      )}
                      {caseItem.remedy && (
                        <div>
                          <div className="text-xs font-bold uppercase text-[#66736d]">Remedy</div>
                          <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.remedy}</div>
                        </div>
                      )}
                    </div>
                    {caseItem.reason_for_remedy && (
                      <div>
                        <div className="text-xs font-bold uppercase text-[#66736d]">Reason for remedy</div>
                        <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.reason_for_remedy}</div>
                      </div>
                    )}
                    {(caseItem.dietary_recommendation || caseItem.lifestyle_recommendation) && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {caseItem.dietary_recommendation && (
                          <div>
                            <div className="text-xs font-bold uppercase text-[#66736d]">Dietary recommendation</div>
                            <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.dietary_recommendation}</div>
                          </div>
                        )}
                        {caseItem.lifestyle_recommendation && (
                          <div>
                            <div className="text-xs font-bold uppercase text-[#66736d]">Lifestyle recommendation</div>
                            <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.lifestyle_recommendation}</div>
                          </div>
                        )}
                      </div>
                    )}
                    {(caseItem.previous_consult_symptoms || caseItem.dietary_changes || caseItem.lifestyle_changes || caseItem.exercise_notes || caseItem.energy_notes || caseItem.evaluation_notes) && (
                      <>
                        <div className="border-t border-[var(--hh-border)] pt-3">
                          <div className="mb-2 text-xs font-bold uppercase text-[var(--hh-purple)]">
                            Follow-up evaluation
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {caseItem.previous_consult_symptoms && (
                              <div>
                                <div className="text-xs font-bold uppercase text-[#66736d]">Previous symptoms</div>
                                <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.previous_consult_symptoms}</div>
                              </div>
                            )}
                            {caseItem.dietary_changes && (
                              <div>
                                <div className="text-xs font-bold uppercase text-[#66736d]">Dietary changes</div>
                                <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.dietary_changes}</div>
                              </div>
                            )}
                            {caseItem.lifestyle_changes && (
                              <div>
                                <div className="text-xs font-bold uppercase text-[#66736d]">Lifestyle changes</div>
                                <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.lifestyle_changes}</div>
                              </div>
                            )}
                            {caseItem.exercise_notes && (
                              <div>
                                <div className="text-xs font-bold uppercase text-[#66736d]">Exercise notes</div>
                                <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.exercise_notes}</div>
                              </div>
                            )}
                            {caseItem.energy_notes && (
                              <div>
                                <div className="text-xs font-bold uppercase text-[#66736d]">Energy notes</div>
                                <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.energy_notes}</div>
                              </div>
                            )}
                            {caseItem.evaluation_notes && (
                              <div>
                                <div className="text-xs font-bold uppercase text-[#66736d]">Evaluation notes</div>
                                <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.evaluation_notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {caseItem.notes && (
                      <div>
                        <div className="text-xs font-bold uppercase text-[#66736d]">Additional notes</div>
                        <div className="mt-0.5 text-sm text-[#1f2933]">{caseItem.notes}</div>
                      </div>
                    )}
                    {caseItem.resolved_at && (
                      <div className="rounded-lg border border-[#d1fae5] bg-[#ecfdf5] p-3">
                        <div className="text-xs font-bold uppercase text-[#065f46]">Resolved on {formatDate(caseItem.resolved_at)}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ClinicalPanel>
  );
}

function AssessmentsTab({ visits, cases }: { visits: Visit[]; cases: Case[] }) {
  const visitRows = visits
    .filter((v) => v.physical_examination)
    .map((v) => ({ id: v.id, title: v.main_complaint || "Assessment", meta: formatDate(v.visit_date), body: v.physical_examination }));
  const caseRows = cases
    .filter((c) => c.physical_examination)
    .map((c) => ({ id: c.id, title: c.title, meta: formatDate(c.visit_date || c.created_at), body: c.physical_examination }));
  const rows = [...visitRows, ...caseRows].sort((a, b) => b.meta.localeCompare(a.meta));

  return (
    <ClinicalPanel title="Assessment history" icon={<Stethoscope size={17} />}>
      <RecordList
        emptyText="No assessments have been recorded for this patient yet."
        rows={rows}
      />
    </ClinicalPanel>
  );
}

function DiagnosisTab({ visits, cases, clinicalAccess }: { visits: Visit[]; cases: Case[]; clinicalAccess?: string }) {
  if (clinicalAccess !== "active") {
    return (
      <ClinicalPanel title="Diagnosis history" icon={<LockKeyhole size={17} />}>
        <LockedClinicalNotice />
      </ClinicalPanel>
    );
  }
  const visitRows = visits
    .filter((v) => v.diagnosis)
    .map((v) => ({ id: v.id, title: v.main_complaint || "Diagnosis", meta: formatDate(v.visit_date), body: v.diagnosis }));
  const caseRows = cases
    .filter((c) => c.diagnosis)
    .map((c) => ({ id: c.id, title: c.title, meta: formatDate(c.visit_date || c.created_at), body: c.diagnosis }));
  const rows = [...visitRows, ...caseRows].sort((a, b) => b.meta.localeCompare(a.meta));

  return (
    <ClinicalPanel title="Diagnosis history" icon={<ShieldCheck size={17} />}>
      <RecordList
        emptyText="No diagnoses have been recorded for this patient yet."
        rows={rows}
      />
    </ClinicalPanel>
  );
}

function RemediesTab({ visits, cases }: { visits: Visit[]; cases: Case[] }) {
  const visitItems = visits.filter((v) => v.remedy || v.dietary_recommendation || v.lifestyle_recommendation).map((v) => ({
    key: `v-${v.id}`, date: v.visit_date, remedy: v.remedy, reason: v.reason_for_remedy,
    dietary: v.dietary_recommendation, lifestyle: v.lifestyle_recommendation
  }));
  const caseItems = cases.filter((c) => c.remedy || c.dietary_recommendation || c.lifestyle_recommendation).map((c) => ({
    key: `c-${c.id}`, date: c.visit_date || c.created_at, remedy: c.remedy, reason: c.reason_for_remedy,
    dietary: c.dietary_recommendation, lifestyle: c.lifestyle_recommendation
  }));
  const items = [...visitItems, ...caseItems].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ClinicalPanel title="Remedy history" icon={<Stethoscope size={17} />}>
      <div className="divide-y divide-[var(--hh-border)]">
        {items.map((item) => (
          <div key={item.key} className="grid gap-3 py-4 first:pt-0 last:pb-0">
            <div>
              <div className="font-bold">{value(item.remedy)}</div>
              <div className="mt-1 text-xs font-bold uppercase text-[#66736d]">{formatDate(item.date)}</div>
            </div>
            <InfoGrid
              rows={[
                ["Reason", value(item.reason)],
                ["Dietary recommendation", value(item.dietary)],
                ["Lifestyle recommendation", value(item.lifestyle)],
              ]}
            />
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-[#66736d]">No remedies have been recorded for this patient yet.</p>
        )}
      </div>
    </ClinicalPanel>
  );
}

function VitalsTab({ vitals }: { vitals: Array<Vital & { visitLabel: string }> }) {
  return (
    <ClinicalPanel title="Vitals history" icon={<HeartPulse size={17} />}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f7faf8] text-xs uppercase text-[#66736d]">
            <tr>
              <th className="px-3 py-2">Recorded</th>
              <th className="px-3 py-2">Visit</th>
              <th className="px-3 py-2">BP</th>
              <th className="px-3 py-2">Pulse</th>
              <th className="px-3 py-2">Temp</th>
              <th className="px-3 py-2">Weight</th>
              <th className="px-3 py-2">Glucose</th>
              <th className="px-3 py-2">Food</th>
            </tr>
          </thead>
          <tbody>
            {vitals.map((vital) => (
              <tr key={vital.id} className="border-t border-[var(--hh-border)]">
                <td className="px-3 py-3">{formatDateTime(vital.recorded_at || vital.created_at)}</td>
                <td className="px-3 py-3">{vital.visitLabel}</td>
                <td className="px-3 py-3">{value(vital.bp_first_reading)} / {value(vital.bp_second_reading)}</td>
                <td className="px-3 py-3">{vital.pulse ? `${vital.pulse} bpm` : "--"}</td>
                <td className="px-3 py-3">{vital.temperature ? `${vital.temperature} C` : "--"}</td>
                <td className="px-3 py-3">{vital.weight ? `${vital.weight} kg` : "--"}</td>
                <td className="px-3 py-3">{vital.glucose_mmol_l ? `${vital.glucose_mmol_l} mmol/L` : "--"}</td>
                <td className="px-3 py-3">{value(vital.glucose_food_type)}</td>
              </tr>
            ))}
            {vitals.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-[#66736d]" colSpan={8}>No vitals have been recorded for this patient yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ClinicalPanel>
  );
}

function FollowUpsTab({ visits, cases }: { visits: Visit[]; cases: Case[] }) {
  const visitRows = visits
    .filter((v) => v.visit_type === "follow_up")
    .map((v) => ({ id: v.id, title: v.main_complaint || "Follow-up", meta: formatDate(v.visit_date), body: v.lifestyle_recommendation || v.dietary_recommendation || v.remedy }));
  const caseRows = cases
    .filter((c) => c.parent_case)
    .map((c) => ({ id: c.id, title: c.title, meta: formatDate(c.visit_date || c.created_at), body: c.evaluation_notes || c.notes || "" }));
  const rows = [...visitRows, ...caseRows].sort((a, b) => b.meta.localeCompare(a.meta));

  return (
    <ClinicalPanel title="Follow-up history" icon={<ClipboardList size={17} />}>
      <RecordList
        emptyText="No follow-ups have been recorded for this patient yet."
        rows={rows}
      />
    </ClinicalPanel>
  );
}

function DocumentsTab({ patient, documents, onDocumentsChange }: { patient: Patient; documents: PatientDocument[]; onDocumentsChange: (docs: PatientDocument[]) => void }) {
  const setDocuments = onDocumentsChange;
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeConsentDocument = documents.find((document) => document.document_type === "consent_form" && document.status !== "rejected");

  async function generateConsent() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${patient.public_id}/documents/consent`, { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.detail || "Consent form could not be generated. Please try again or refresh the patient record.");
        return;
      }
      const doc = json as PatientDocument;
      setDocuments([doc, ...documents.filter((d) => d.id !== doc.id)]);
      toast.success(response.status === 201 ? "Consent form generated" : "Existing consent form opened");
      window.open(`/api/patient-documents/${doc.id}/download?v=${Date.now()}`, "_blank", "noopener,noreferrer");
    } catch {
      setError("Consent form could not be generated. Check the connection and try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ClinicalPanel title="Documents" icon={<ClipboardList size={17} />}>
      <ActionErrorDialog
        open={Boolean(error)}
        title="Consent form unavailable"
        description="The document action was not completed."
        message={error || ""}
        onOpenChange={(open) => !open && setError(null)}
      />
      <div className="grid gap-4">
        <div className="flex flex-col gap-3 rounded-lg border border-[#d8c0e8] bg-[#f7f0fb] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-bold text-[var(--hh-purple-dark)]">Consent form</div>
            <p className="mt-1 text-sm leading-6 text-[#53605a]">
              Generate the internal consent document before clinical consultation starts. If one already exists, the system opens the existing document instead of creating another copy.
            </p>
          </div>
          <Button type="button" onClick={generateConsent} disabled={generating}>
            <FileText size={16} />
            {generating ? "Opening..." : activeConsentDocument ? "Open consent" : "Generate consent"}
          </Button>
        </div>
        <div className="divide-y divide-[var(--hh-border)] rounded-lg border border-[var(--hh-border)] bg-white">
          {documents.map((document) => (
            <div key={document.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-bold">{document.title}</div>
                <div className="mt-1 text-xs font-bold uppercase text-[#66736d]">
                  {document.document_type_label || document.document_type.replaceAll("_", " ")} - {document.status_label || document.status.replaceAll("_", " ")}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {document.document_type === "consent_form" && document.status === "pending_signature" && (
                  <ConsentSignatureDialog
                    document={document}
                    patient={patient}
                    onSigned={(signedDocument) => setDocuments(documents.map((item) => (item.id === signedDocument.id ? signedDocument : item)))}
                  />
                )}
                <Button asChild variant="secondary" size="sm">
                  <a href={`/api/patient-documents/${document.id}/download?v=${encodeURIComponent(document.updated_at || document.status)}`} target="_blank" rel="noreferrer">
                    <Download size={15} />
                    Open PDF
                  </a>
                </Button>
              </div>
            </div>
          ))}
          {documents.length === 0 && <p className="p-4 text-sm text-[#66736d]">No documents have been uploaded or generated for this patient yet.</p>}
        </div>
      </div>
    </ClinicalPanel>
  );
}

function ConsentSignatureDialog({
  document,
  patient,
  onSigned
}: {
  document: PatientDocument;
  patient: Patient;
  onSigned: (document: PatientDocument) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"review" | "sign">("review");
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState(patient.full_name_display);
  const [signerCapacity, setSignerCapacity] = useState("Patient");
  const [acknowledgement, setAcknowledgement] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (!open || step !== "sign" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const { width } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(180 * ratio);
      const context = canvas.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      padRef.current?.clear();
    };
    canvas.style.touchAction = "none";
    window.requestAnimationFrame(() => {
      resizeCanvas();
      padRef.current = new SignaturePad(canvas, {
        backgroundColor: "rgb(255,255,255)",
        penColor: "rgb(31,41,51)",
        minWidth: 0.8,
        maxWidth: 2.4
      });
      padRef.current.clear();
    });
    window.addEventListener("resize", resizeCanvas);
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      padRef.current?.off();
      padRef.current = null;
    };
  }, [open, step]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setStep("review");
      setAcknowledgement(false);
      setError(null);
      padRef.current?.clear();
    }
  }

  function continueToSignature() {
    if (!acknowledgement) {
      setError("The patient or authorized signer must confirm that they have read and agreed to the consent form before signing.");
      return;
    }
    setStep("sign");
  }

  async function signDocument() {
    const signaturePad = padRef.current;
    if (!signaturePad || signaturePad.isEmpty()) {
      setError("A handwritten signature is required before the consent form can be signed.");
      return;
    }
    setSigning(true);
    setError(null);
    try {
      const signatureImage = signaturePad.toDataURL("image/png");
      const response = await fetch(`/api/patient-documents/${document.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signer_name: signerName,
          signer_capacity: signerCapacity,
          signature_image: signatureImage,
          acknowledgement
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.detail || "Consent form could not be signed.");
        return;
      }
      onSigned(data);
      toast.success("Consent form signed");
      window.open(`/api/patient-documents/${data.id}/download?v=${Date.now()}`, "_blank", "noopener,noreferrer");
      setOpen(false);
    } catch {
      setError("Consent form could not be signed. Check the connection and try again.");
    } finally {
      setSigning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <ActionErrorDialog
        open={Boolean(error)}
        title="Consent signature unavailable"
        description="The digital signature was not completed."
        message={error || ""}
        onOpenChange={(dialogOpen) => !dialogOpen && setError(null)}
      />
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <PenLine size={15} />
          Sign on screen
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,1120px)]">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">
            {step === "review" ? "Review consent form" : "Sign consent form"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#66736d]">
            {step === "review"
              ? "The patient must read the consent document first, then confirm agreement before the signing pad is shown."
              : "Capture the handwritten signature, then regenerate the PDF with the signature embedded."}
          </DialogDescription>
        </div>
        {step === "review" ? (
          <div className="grid max-h-[78vh] gap-4 overflow-y-auto p-5">
            <div className="min-h-[640px] overflow-hidden rounded-lg border border-[var(--hh-border)] bg-white">
              <iframe title="Consent form preview" src={`/api/patient-documents/${document.id}/preview`} className="h-[72vh] min-h-[640px] w-full bg-white" />
            </div>
            <div className="sticky bottom-0 grid gap-3 rounded-lg border border-[var(--hh-border)] bg-white p-4 shadow-sm">
              <label className="flex items-start gap-3 text-sm leading-6 text-[#3f4d47]">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={acknowledgement} onChange={(event) => setAcknowledgement(event.target.checked)} />
                <span>I confirm the patient or authorized signer has read the full consent form and agrees to proceed with signing.</span>
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={continueToSignature} disabled={!acknowledgement}>
                  <PenLine size={16} />
                  Continue to signature
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid max-h-[78vh] gap-4 overflow-y-auto p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-1 text-sm font-bold text-[#53605a]">
                Signer full name
                <input className="h-11 rounded-lg border border-[var(--hh-border)] px-3 text-base font-normal text-[#17211d]" value={signerName} onChange={(event) => setSignerName(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm font-bold text-[#53605a]">
                Signing capacity
                <select className="h-11 rounded-lg border border-[var(--hh-border)] px-3 text-base font-normal text-[#17211d]" value={signerCapacity} onChange={(event) => setSignerCapacity(event.target.value)}>
                  <option>Patient</option>
                  <option>Parent / guardian</option>
                  <option>Authorized representative</option>
                </select>
              </label>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-bold text-[#53605a]">Handwritten signature</div>
              <div className="rounded-lg border border-[var(--hh-border)] bg-white p-2">
                <canvas ref={canvasRef} className="block h-[180px] w-full touch-none rounded-md border border-dashed border-[#b7c8bf] bg-white" />
              </div>
              <div className="flex justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={() => padRef.current?.clear()}>
                  Clear signature
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setStep("review")}>
                Back to document
              </Button>
              <Button type="button" onClick={signDocument} disabled={signing}>
                <PenLine size={16} />
                {signing ? "Signing..." : "Apply signature to PDF"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotesTab({ patient, profile, latestVisit }: { patient: Patient; profile?: PatientProfile | null; latestVisit?: Visit }) {
  return (
    <ClinicalPanel title="Patient notes" icon={<ClipboardList size={17} />}>
      <InfoGrid
        rows={[
          ["Key notes", value(profile?.other_important_information || latestVisit?.main_complaint)],
          ["Allopathic medication", value(profile?.allopathic_medication)],
          ["Family medical history", value(profile?.family_medical_history)],
          ["Past medical history", value(profile?.past_medical_history)]
        ]}
      />
    </ClinicalPanel>
  );
}

function LatestVitalsPanel({ vitals }: { vitals?: Vital & { visitLabel: string } }) {
  return (
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
            ["Recorded", formatDateTime(vitals.recorded_at || vitals.created_at)]
          ]}
        />
      ) : (
        <p className="text-sm text-[#66736d]">No vitals recorded yet.</p>
      )}
    </ClinicalPanel>
  );
}

function VisitTimeline({ visits }: { visits: Visit[] }) {
  return (
    <ClinicalPanel title="Visit timeline" icon={<ClipboardList size={17} />}>
      <div className="divide-y divide-[var(--hh-border)]">
        {visits.map((visit) => (
          <div key={visit.id} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[110px_1fr]">
            <div className="text-xs font-bold uppercase text-[#66736d]">{formatDate(visit.visit_date)}</div>
            <div>
              <div className="font-bold capitalize">{visit.visit_type.replaceAll("_", " ")}</div>
              <p className="mt-1 text-sm leading-6 text-[#53605a]">{visit.main_complaint}</p>
            </div>
          </div>
        ))}
        {visits.length === 0 && <p className="text-sm text-[#66736d]">No visit history visible.</p>}
      </div>
    </ClinicalPanel>
  );
}

function ConfidentialRecords({ patient, profile }: { patient: Patient; profile?: PatientProfile | null }) {
  if (!profile) {
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
        <HivStatusCard status={profile.hiv_status} />
        <ConditionSummary conditions={patient.conditions || []} />
      </div>
    </ClinicalPanel>
  );
}

function ConditionSummary({ conditions }: { conditions: Patient["conditions"] }) {
  const conditionMap = new Map((conditions || []).map((condition) => [condition.condition_code, condition]));

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {CONFIDENTIAL_CONDITIONS.map((condition) => {
        const record = conditionMap.get(condition.code);
        const present = record?.present ?? false;
        return (
          <div key={condition.code} className="rounded-lg border border-[var(--hh-border)] bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">{condition.label}</span>
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${present ? "bg-[var(--hh-green)] text-white" : "bg-slate-100 text-slate-600"}`} aria-label={present ? "Yes" : "No"}>
                {present ? <Check size={17} /> : <X size={17} />}
              </span>
            </div>
            {present && record?.notes && <p className="mt-2 text-xs leading-5 text-[#53605a]">{record.notes}</p>}
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
                <span className={`rounded-full border px-3 py-1 text-sm font-bold capitalize ${active ? "border-[#9bd6a6] bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]" : "border-[var(--hh-border)] bg-slate-50 text-slate-600"}`} key={option}>
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

function RecordList({ rows, emptyText }: { rows: Array<{ id: number; title: string; meta: string; body?: string }>; emptyText: string }) {
  return (
    <div className="divide-y divide-[var(--hh-border)]">
      {rows.map((row) => (
        <div key={row.id} className="py-4 first:pt-0 last:pb-0">
          <div className="font-bold">{row.title}</div>
          <div className="mt-1 text-xs font-bold uppercase text-[#66736d]">{row.meta}</div>
          {row.body && <p className="mt-2 text-sm leading-6 text-[#53605a]">{row.body}</p>}
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-[#66736d]">{emptyText}</p>}
    </div>
  );
}

function EmptyTab({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  return (
    <ClinicalPanel title={title} icon={icon}>
      <p className="text-sm text-[#66736d]">{text}</p>
    </ClinicalPanel>
  );
}

function ProcessMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-3">
      <div className="text-xs font-bold uppercase text-[#66736d]">{label}</div>
      <div className="mt-1 font-bold text-[#1f2933]">{value}</div>
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
