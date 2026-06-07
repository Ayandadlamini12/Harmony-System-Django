"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Check,
  ClipboardList,
  Download,
  Eye,
  FileText,
  HeartPulse,
  ListChecks,
  LockKeyhole,
  PenLine,
  Printer,
  Scale,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  UserRound,
  X
} from "lucide-react";
import SignaturePad from "signature_pad";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ActionErrorDialog } from "@/components/action-error-dialog";
import { ClinicalPanel } from "@/components/clinical-panel";
import { PatientAccessLogDialog } from "@/components/patient-access-log-dialog";
import { PatientAppointmentDialog } from "@/components/patient-appointment-dialog";
import { PatientMedicalHistoryDialog } from "@/components/patient-medical-history-dialog";
import { PatientVitalsDialog } from "@/components/patient-vitals-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import { showActionError } from "@/lib/action-error";
import { relationshipLabel } from "@/lib/relationships";
import { getDraftKey, isDraftExpired } from "@/lib/draft-utils";
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
  const directVitals = (patient.vitals || []).map((vital) => ({
    ...vital,
    visitLabel: vital.visit_label || "No associated visit"
  }));
  const nestedVitals = (patient.visits || [])
    .flatMap((visit) => (visit.vitals || []).map((vital) => ({
      ...vital,
      visitLabel: vital.visit_label || `${visit.visit_date} - ${visit.visit_type.replaceAll("_", " ")}`
    })));
  
  const allMap = new Map<number, any>();
  for (const v of nestedVitals) allMap.set(v.id, v);
  for (const v of directVitals) allMap.set(v.id, v);
  
  return Array.from(allMap.values())
    .sort((a, b) => new Date(b.recorded_at || b.created_at || "").getTime() - new Date(a.recorded_at || a.created_at || "").getTime());
}

function disabledWorkflowButton(action: PatientWorkflowAction | undefined, icon: ReactNode, label: string) {
  return (
    <Button variant="secondary" type="button" disabled title={action?.reason || "This action is not available yet."} className="text-xs">
      {icon}
      {label}
    </Button>
  );
}

// Visual Vitals helpers for clinical ranges and color categorization
function getBPStatus(sysVal?: string, diaVal?: string) {
  const sys = parseInt(sysVal || "0", 10);
  const dia = parseInt(diaVal || "0", 10);
  if (!sys || !dia) {
    return { label: "Unknown", color: "text-slate-500", badge: "bg-slate-100 text-slate-700", pct: 0 };
  }
  if (sys > 180 || dia > 120) {
    return { label: "Crisis", color: "text-red-700 font-extrabold", badge: "bg-red-700 text-white animate-pulse", pct: 95 };
  }
  if (sys >= 140 || dia >= 90) {
    return { label: "Stage 2 Hyper", color: "text-red-600", badge: "bg-red-500 text-white", pct: 80 };
  }
  if ((sys >= 130 && sys < 140) || (dia >= 80 && dia < 90)) {
    return { label: "Stage 1 Hyper", color: "text-orange-600", badge: "bg-orange-500 text-white", pct: 60 };
  }
  if (sys >= 120 && sys < 130 && dia < 80) {
    return { label: "Elevated", color: "text-amber-600", badge: "bg-amber-400 text-slate-950", pct: 40 };
  }
  return { label: "Optimal", color: "text-emerald-700", badge: "bg-emerald-500 text-white", pct: 20 };
}

function getPulseStatus(pulse?: number | null) {
  if (!pulse) {
    return { label: "Unknown", color: "text-slate-500", badge: "bg-slate-100 text-slate-700", pct: 0 };
  }
  if (pulse > 100) {
    return { label: "Tachycardia", color: "text-rose-600", badge: "bg-rose-500 text-white", pct: 85 };
  }
  if (pulse < 60) {
    return { label: "Bradycardia", color: "text-sky-600", badge: "bg-sky-400 text-white", pct: 15 };
  }
  return { label: "Normal", color: "text-emerald-700", badge: "bg-emerald-500 text-white", pct: 50 };
}

function getTempStatus(tempVal?: string | null) {
  if (!tempVal) {
    return { label: "Unknown", color: "text-slate-500", badge: "bg-slate-100 text-slate-700", pct: 0 };
  }
  const temp = parseFloat(tempVal);
  if (isNaN(temp)) {
    return { label: "Unknown", color: "text-slate-500", badge: "bg-slate-100 text-slate-700", pct: 0 };
  }
  if (temp > 38.3) {
    return { label: "High Fever", color: "text-red-600", badge: "bg-red-500 text-white", pct: 90 };
  }
  if (temp >= 37.3) {
    return { label: "Low Fever", color: "text-amber-600", badge: "bg-amber-400 text-slate-950", pct: 65 };
  }
  if (temp < 35.0) {
    return { label: "Hypothermia", color: "text-sky-600", badge: "bg-sky-400 text-white", pct: 15 };
  }
  return { label: "Normal", color: "text-emerald-700", badge: "bg-emerald-500 text-white", pct: 45 };
}

function getGlucoseStatus(glucoseVal?: string | null, context?: string) {
  if (!glucoseVal) {
    return { label: "Unknown", color: "text-slate-500", badge: "bg-slate-100 text-slate-700", pct: 0 };
  }
  const val = parseFloat(glucoseVal);
  if (isNaN(val)) {
    return { label: "Unknown", color: "text-slate-500", badge: "bg-slate-100 text-slate-700", pct: 0 };
  }
  
  const isFasting = context === "fasting";
  if (val < 4.0) {
    return { label: "Hypoglycemia", color: "text-red-600", badge: "bg-red-500 text-white", pct: 10 };
  }
  
  if (isFasting) {
    if (val >= 7.0) return { label: "Diabetes (Fasting)", color: "text-red-700 font-bold", badge: "bg-red-600 text-white", pct: 85 };
    if (val >= 5.7) return { label: "Pre-Diabetes", color: "text-amber-600", badge: "bg-amber-400 text-slate-950", pct: 60 };
    return { label: "Normal (Fasting)", color: "text-emerald-700", badge: "bg-emerald-500 text-white", pct: 35 };
  } else {
    if (val >= 11.1) return { label: "High (Post-Prandial)", color: "text-red-700 font-bold", badge: "bg-red-600 text-white", pct: 85 };
    if (val >= 7.9) return { label: "Elevated", color: "text-amber-600", badge: "bg-amber-400 text-slate-950", pct: 60 };
    return { label: "Normal (Fed)", color: "text-emerald-700", badge: "bg-emerald-500 text-white", pct: 35 };
  }
}

export function PatientRecordWorkspace({ patient: initialPatient, canCreateVisit, initialCases }: { patient: Patient; canCreateVisit: boolean; initialCases: Case[] }) {
  const router = useRouter();
  const [patient, setPatient] = useState(initialPatient);
  const [activeTab, setActiveTab] = useState<RecordTab>("overview");
  const [profile, setProfile] = useState(initialPatient.profile);
  const [documents, setDocuments] = useState(initialPatient.documents || []);
  const [draftTime, setDraftTime] = useState<string | null>(null);

  useEffect(() => {
    setPatient(initialPatient);
    setProfile(initialPatient.profile);
    setDocuments(initialPatient.documents || []);
  }, [initialPatient]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draftKey = getDraftKey(String(patient.id));
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.timestamp && !isDraftExpired(parsed.timestamp)) {
          setDraftTime(parsed.timestamp);
        } else if (parsed && isDraftExpired(parsed.timestamp)) {
          localStorage.removeItem(draftKey);
          setDraftTime(null);
        }
      } catch (err) {
        console.error("Failed to parse patient draft:", err);
      }
    } else {
      setDraftTime(null);
    }
  }, [patient]);

  const [isCheckingIn, setIsCheckingIn] = useState(false);

  async function handleDirectCheckIn() {
    setIsCheckingIn(true);
    try {
      const response = await fetch("/api/check-ins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient: patient.id,
          visit_type: "new_consultation",
          method: "reception",
          identifier_type: "reception_selected_patient",
          source_label: "Clinical workspace direct",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.detail || "Direct check-in could not be completed.");
        return;
      }
      toast.success("Patient checked in successfully!");
      router.refresh();
    } catch (err) {
      toast.error("Could not connect to start patient journey.");
    } finally {
      setIsCheckingIn(false);
    }
  }

  const latestVisit = patient.visits?.[0];
  const latestVitals = allVitals(patient)[0];
  const workflowActions = patient.patient_actions || [];
  const actionFor = (key: PatientWorkflowAction["key"]) => workflowActions.find((action) => action.key === key);
  const consentAction = actionFor("consent_forms");
  const checkInAction = actionFor("check_in");
  const historyAction = actionFor("medical_history");
  const confidentialAction = actionFor("confidential_records");
  const vitalsAction = actionFor("vitals");
  const visitAction = actionFor("visits");
  const nextAction = workflowActions.find((action) => action.next);
  const consentSigned = consentAction?.completed ?? false;

  return (
    <>
      {/* Draft Alerts / Notification Banners (Sticky, Full-width at top) */}
      <div className="space-y-2 mb-4">
        {draftTime && (
          <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <ClipboardList className="text-amber-600 mt-0.5 shrink-0" size={20} />
              <div>
                <div className="font-bold text-amber-950">Active visit draft in progress!</div>
                <p className="mt-0.5 text-[#78350f] text-xs">
                  We found an unsaved visit/case draft for this patient from {new Date(draftTime).toLocaleString()}.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 sm:self-center">
              <Button asChild size="sm" className="border-amber-300 bg-amber-600 text-white hover:bg-amber-700 font-bold shadow-sm">
                <Link href={`/visits/new?patient=${patient.id}&restore=1`}>
                  Resume Draft
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const draftKey = getDraftKey(String(patient.id));
                  localStorage.removeItem(draftKey);
                  setDraftTime(null);
                  toast.success("Draft discarded");
                }}
                className="text-amber-800 hover:bg-amber-100 hover:text-amber-950 font-semibold"
              >
                Discard
              </Button>
            </div>
          </div>
        )}
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
      </div>

      {/* Main Container */}
      <div className="space-y-5 min-w-0">
          
          {/* horizontal tabs header (Pill background) */}
          <div className="sticky top-16 z-20 border-b border-[var(--hh-border)] bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-xs">
            <div className="flex gap-1 overflow-x-auto">
              {recordTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`min-h-10 shrink-0 rounded-lg px-4 text-xs font-extrabold tracking-wide transition-all ${
                    activeTab === tab.key
                      ? "bg-[var(--hh-purple)] text-white shadow-sm"
                      : "border-transparent text-[#3f4d47] hover:bg-slate-50 hover:text-[#111827]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick-action items bar */}
          <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--hh-border)] bg-white p-3 shadow-xs">
            {consentAction?.enabled ? (
              <Button variant="secondary" type="button" onClick={() => setActiveTab("documents")} className="text-xs">
                <FileText size={15} />
                {consentAction.completed ? "Consent form" : "Sign consent"}
              </Button>
            ) : (
              disabledWorkflowButton(consentAction, <FileText size={15} />, "Consent form")
            )}
            {checkInAction?.enabled ? (
              <Button 
                variant="secondary" 
                className="text-xs font-bold"
                onClick={handleDirectCheckIn}
                disabled={isCheckingIn || checkInAction.completed}
              >
                {isCheckingIn ? (
                  <>
                    <span className="animate-spin mr-1">⌛</span>
                    Checking in...
                  </>
                ) : (
                  <>
                    <ListChecks size={15} />
                    {checkInAction.completed ? "Patient checked in" : "Check in / queue"}
                  </>
                )}
              </Button>
            ) : (
              disabledWorkflowButton(checkInAction, <ListChecks size={15} />, "Check in / queue")
            )}
            {canCreateVisit && visitAction?.enabled ? (
              <Button asChild className="text-xs">
                <Link className="!text-white" href={`/visits/new?patient=${patient.id}`}>
                  <ClipboardList size={15} />
                  New visit
                </Link>
              </Button>
            ) : (
              disabledWorkflowButton(visitAction, <ClipboardList size={15} />, "New visit")
            )}
            {canCreateVisit && historyAction?.enabled ? (
              <PatientMedicalHistoryDialog patient={{ ...patient, profile }} onSaved={(p) => setProfile(p)} />
            ) : (
              disabledWorkflowButton(historyAction, <HeartPulse size={15} />, "Medical history")
            )}
            {canCreateVisit && confidentialAction?.enabled ? (
              <Button variant="secondary" type="button" onClick={() => setActiveTab("overview")} className="text-xs">
                <ShieldCheck size={15} />
                Confidential records
              </Button>
            ) : (
              disabledWorkflowButton(confidentialAction, <ShieldCheck size={15} />, "Confidential records")
            )}
            {canCreateVisit && vitalsAction?.enabled ? <PatientVitalsDialog patient={patient} /> : disabledWorkflowButton(vitalsAction, <HeartPulse size={15} />, "Add vitals")}
            <Button variant="secondary" type="button" className="text-xs">
              <Printer size={15} />
              Print summary
            </Button>
            <PatientAppointmentDialog patient={patient} />
            <PatientAccessLogDialog patient={patient} />
          </div>

          {/* Dynamic Tab panels */}
          <section className="grid gap-5">
            {activeTab === "overview" && <OverviewTab patient={patient} latestVisit={latestVisit} latestVitals={latestVitals} profile={profile} />}
            {activeTab === "cases" && <CasesTab patient={patient} onUpdatePatient={setPatient} />}
            {activeTab === "assessments" && <AssessmentsTab visits={patient.visits || []} cases={initialCases} />}
            {activeTab === "diagnosis" && <DiagnosisTab visits={patient.visits || []} cases={initialCases} clinicalAccess={patient.clinical_access} />}
            {activeTab === "remedies" && <RemediesTab visits={patient.visits || []} cases={initialCases} patient={patient} />}
            {activeTab === "vitals" && <VitalsTab vitals={allVitals(patient)} patient={patient} />}
            {activeTab === "follow_ups" && <FollowUpsTab visits={patient.visits || []} cases={initialCases} />}
            {activeTab === "documents" && <DocumentsTab patient={patient} documents={documents} onDocumentsChange={setDocuments} />}
            {activeTab === "notes" && <NotesTab patient={patient} latestVisit={latestVisit} profile={profile} />}
          </section>

        </div>
    </>
  );
}

function OverviewTab({ patient, latestVisit, latestVitals, profile }: { patient: Patient; latestVisit?: Visit; latestVitals?: Vital & { visitLabel: string }; profile?: PatientProfile | null }) {
  return (
    <div className="grid gap-6 animate-fade-in">
      {/* Allergy Alert Warning Banner */}
      {patient.allergies && (
        <div className="relative overflow-hidden rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-xs">
          <div className="absolute top-0 left-0 h-full w-1.5 bg-red-500 animate-pulse"></div>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-red-100 p-1.5 text-red-700 shrink-0 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div>
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-red-800">Critical Clinical Warning</h4>
              <p className="mt-1 text-sm font-black text-red-950">
                Allergies / Contraindications: <span className="underline decoration-red-500 decoration-2">{patient.allergies}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 1. Visual Vitals indicators Dashboard */}
      <LatestVitalsPanel vitals={latestVitals} />

      {/* 2. Responsive Bento Split Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-5">
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
        </div>

        <div className="space-y-5">
          <VisitTimeline visits={patient.visits || []} />
        </div>
      </div>

      {/* 3. Confidential disclosures section */}
      <ConfidentialRecords patient={patient} profile={profile} />
    </div>
  );
}



function CasesTab({ patient, onUpdatePatient }: { patient: Patient; onUpdatePatient: (updated: Patient) => void }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const visits = patient.visits || [];

  async function resolveSymptom(visitId: number, symptomId: number) {
    setResolvingId(symptomId);
    try {
      const res = await fetch(`/api/visits/${visitId}/resolve-symptom/${symptomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error();

      const updatedVisits = visits.map((v) => {
        const updatedSymptoms = (v.symptom_problems || []).map((s) => {
          if (s.id === symptomId) {
            return {
              ...s,
              status: "resolved" as const,
              resolved_at: new Date().toISOString(),
            };
          }
          return s;
        });
        return {
          ...v,
          symptom_problems: updatedSymptoms,
        };
      });

      onUpdatePatient({
        ...patient,
        visits: updatedVisits,
      });

      toast.success("Symptom resolved successfully!");
    } catch (err) {
      toast.error("Could not resolve symptom.");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <ClinicalPanel title="Patient cases (Encounters & Symptoms)" icon={<ClipboardList size={17} />}>
      {visits.length === 0 ? (
        <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-6 text-center animate-fade-in">
          <p className="text-sm font-bold text-[#66736d]">No visits recorded yet</p>
          <p className="mt-1 text-sm leading-6 text-[#66736d]">Please check in the patient to start a clinical visit.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--hh-border)]">
          {visits.map((visit) => {
            const isExpanded = expandedId === visit.id;
            const visitSymptoms = (visit.symptom_problems || []).filter(
              (s) => s.opened_visit === visit.id
            );
            const hasOpenSymptoms = visitSymptoms.some((s) => s.status === "open");
            const visitStatus = hasOpenSymptoms ? "open" : "resolved";

            return (
              <div key={visit.id} className="py-4 first:pt-0 last:pb-0 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-bold hover:text-[var(--hh-purple)] text-sm sm:text-base text-[var(--hh-purple-dark)] transition-colors duration-150"
                        onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                      >
                        {visit.main_complaint || `Visit on ${formatDate(visit.visit_date)}`}
                      </button>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wider border shadow-2xs ${
                          visitStatus === "open"
                            ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {visitStatus === "open" ? "Open" : "Resolved"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-slate-600">
                        {visit.visit_type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#66736d]">
                      <span>{formatDate(visit.visit_date)}</span>
                      {visit.diagnosis && (
                        <span className="font-semibold text-slate-700">
                          Diagnosis: {visit.diagnosis}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-slate-100 active:scale-95 transition-all duration-150"
                      onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 grid gap-4 rounded-xl border border-[var(--hh-border)] bg-[#f7faf8] p-4 transition-all duration-300 animate-slide-down">
                    <div className="grid gap-3 sm:grid-cols-2 border-b border-[var(--hh-border)] pb-3">
                      <div>
                        <div className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Main complaint / History</div>
                        <div className="mt-1 text-sm text-[#1f2933] leading-relaxed font-medium">
                          {visit.main_complaint || "No primary complaint details logged."}
                        </div>
                        {visit.initial_complaints && (
                          <div className="mt-1.5 text-xs text-[#53605a] italic">
                            {visit.initial_complaints}
                          </div>
                        )}
                      </div>
                      {visit.physical_examination && (
                        <div>
                          <div className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Physical examination</div>
                          <div className="mt-1 text-sm text-[#1f2933] leading-relaxed font-medium">{visit.physical_examination}</div>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 border-b border-[var(--hh-border)] pb-3">
                      {visit.diagnosis && (
                        <div>
                          <div className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Diagnosis</div>
                          <div className="mt-1 text-sm font-extrabold text-[var(--hh-purple-dark)]">{visit.diagnosis}</div>
                        </div>
                      )}
                      {visit.remedy && (
                        <div>
                          <div className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Remedy / Treatment</div>
                          <div className="mt-1 text-sm font-semibold text-emerald-800">{visit.remedy}</div>
                        </div>
                      )}
                    </div>

                    {(visit.dietary_recommendation || visit.lifestyle_recommendation) && (
                      <div className="grid gap-3 sm:grid-cols-2 border-b border-[var(--hh-border)] pb-3">
                        {visit.dietary_recommendation && (
                          <div>
                            <div className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Dietary recommendations</div>
                            <div className="mt-1 text-sm text-[#1f2933]">{visit.dietary_recommendation}</div>
                          </div>
                        )}
                        {visit.lifestyle_recommendation && (
                          <div>
                            <div className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">Lifestyle recommendations</div>
                            <div className="mt-1 text-sm text-[#1f2933]">{visit.lifestyle_recommendation}</div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <div className="mb-2.5 text-2xs font-extrabold uppercase tracking-wider text-[var(--hh-purple)]">
                        Logged Symptoms & Clinical Problems
                      </div>
                      {visitSymptoms.length === 0 ? (
                        <div className="text-xs text-[#66736d] italic bg-white/60 border border-dashed border-slate-200 rounded-lg p-3 text-center">
                          No specific clinical symptoms or problems were registered for this visit.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visitSymptoms.map((symptom) => (
                            <div
                              key={symptom.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-2xs hover:border-slate-200 transition-colors duration-150"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-800 text-sm">{symptom.description}</span>
                                  <span
                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-3xs font-extrabold uppercase ${
                                      symptom.status === "open"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    }`}
                                  >
                                    {symptom.status}
                                  </span>
                                </div>
                                {symptom.note && (
                                  <p className="mt-1 text-xs text-slate-500 font-medium">
                                    <span className="text-slate-400 font-semibold">Note:</span> {symptom.note}
                                  </p>
                                )}
                                {symptom.status === "resolved" && symptom.resolved_at && (
                                  <p className="mt-1 text-3xs text-emerald-600 font-bold">
                                    ✓ Resolved on {formatDate(symptom.resolved_at)}
                                  </p>
                                )}
                              </div>
                              {symptom.status === "open" && (
                                <div className="shrink-0 sm:self-center">
                                  <Button
                                    size="sm"
                                    onClick={() => resolveSymptom(visit.id, symptom.id)}
                                    disabled={resolvingId === symptom.id}
                                    className="h-8 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all duration-150 flex items-center gap-1.5 shadow-2xs"
                                  >
                                    {resolvingId === symptom.id ? (
                                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    ) : (
                                      <Check size={14} className="stroke-[3]" />
                                    )}
                                    Resolve
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

function printRemedyLeaflet(patientName: string, patientCode: string, item: any) {
  const printWindow = window.open("", "_blank", "width=800,height=600");
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head>
        <title>Harmony Health — Patient Care Guidelines</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            color: #1a221d;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #3f1d58;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #3f1d58;
          }
          .clinic-info {
            text-align: right;
            font-size: 12px;
            color: #555;
          }
          .patient-card {
            background: #f8f4f9;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 30px;
            border-left: 4px solid #3f1d58;
          }
          .patient-title {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            color: #888;
            margin-bottom: 5px;
          }
          .patient-name {
            font-size: 18px;
            font-weight: bold;
            color: #1a0826;
          }
          .section-title {
            font-size: 14px;
            text-transform: uppercase;
            font-weight: 800;
            color: #3f1d58;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-top: 30px;
            margin-bottom: 12px;
          }
          .content-text {
            font-size: 15px;
            line-height: 1.6;
            margin: 0;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 11px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Harmony Health MIS</div>
          <div class="clinic-info">
            <strong>Harmony Health Clinic</strong><br/>
            Eswatini<br/>
            https://mis.harmonyhealthsz.com
          </div>
        </div>
        <div class="patient-card">
          <div class="patient-title">Patient Treatment Leaflet</div>
          <div class="patient-name">\${patientName} (\${patientCode})</div>
          <div style="font-size:12px; color:#555; margin-top:5px;">Date Issued: \${new Intl.DateTimeFormat('en', {dateStyle: 'long'}).format(new Date(item.date))}</div>
        </div>
        
        <div class="section-title">Prescribed Remedy / Protocol</div>
        <p class="content-text" style="font-weight:bold; font-size:17px; color:#115e59;">\${item.remedy || 'No specific remedy recorded'}</p>
        
        \${item.reason && item.reason !== '--' ? \`
          <div class="section-title">Clinical Reasoning / Notes</div>
          <p class="content-text">\${item.reason}</p>
        \` : ''}

        \${item.dietary && item.dietary !== '--' ? \`
          <div class="section-title">Dietary Guidelines</div>
          <p class="content-text">\${item.dietary}</p>
        \` : ''}

        \${item.lifestyle && item.lifestyle !== '--' ? \`
          <div class="section-title">Lifestyle Guidelines</div>
          <p class="content-text">\${item.lifestyle}</p>
        \` : ''}

        <div class="footer">
          This document is generated by Harmony Health Management Information System. 
          Please follow guidelines exactly as specified by your healthcare practitioner.
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function RemediesTab({ visits, cases, patient }: { visits: Visit[]; cases: Case[]; patient: Patient }) {
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
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-extrabold text-[#111827] text-base">{value(item.remedy)}</div>
                <div className="mt-1 text-xs font-bold uppercase text-[#66736d]">{formatDate(item.date)}</div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="text-xs h-8 border-[var(--hh-border)] hover:bg-slate-50 font-bold"
                onClick={() => printRemedyLeaflet(patient.full_name_display, patient.patient_code, item)}
              >
                <Printer size={13} className="mr-1" />
                Print Leaflet
              </Button>
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

function VitalsTrendCharts({ vitals }: { vitals: Array<Vital & { visitLabel: string }> }) {
  const reversed = [...vitals].reverse().slice(-10); // get last 10 readings
  const chartData = reversed.map((v) => {
    const date = formatDate(v.recorded_at || v.created_at);
    const sys = parseInt(v.bp_first_reading || "0", 10) || undefined;
    const dia = parseInt(v.bp_second_reading || "0", 10) || undefined;
    const weight = parseFloat(v.weight || "") || undefined;
    return { date, sys, dia, weight };
  }).filter(d => d.sys !== undefined || d.dia !== undefined || d.weight !== undefined);

  if (chartData.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 mb-6">
        📊 Chart requires at least 2 historical vitals entries to plot trends.
      </div>
    );
  }

  // BP Chart calculation
  const bpData = chartData.filter(d => d.sys !== undefined && d.dia !== undefined);
  const sysValues = bpData.map(d => d.sys!);
  const diaValues = bpData.map(d => d.dia!);
  const bpMax = Math.max(...sysValues, 150) + 10;
  const bpMin = Math.min(...diaValues, 60) - 10;

  // Weight Chart calculation
  const wData = chartData.filter(d => d.weight !== undefined);
  const wValues = wData.map(d => d.weight!);
  const wMax = Math.max(...wValues, 80) + 5;
  const wMin = Math.min(...wValues, 40) - 5;

  const w = 500;
  const h = 180;
  const paddingL = 45;
  const paddingR = 20;
  const paddingTop = 25;
  const paddingBottom = 30;

  const getX = (index: number, total: number) => {
    if (total <= 1) return paddingL;
    return paddingL + (index / (total - 1)) * (w - paddingL - paddingR);
  };

  const getY = (val: number, min: number, max: number) => {
    return h - paddingBottom - ((val - min) / (max - min)) * (h - paddingTop - paddingBottom);
  };

  return (
    <div className="grid gap-5 md:grid-cols-2 mb-6">
      {/* BP Trend Card */}
      {bpData.length >= 2 ? (
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--hh-purple)] flex items-center gap-1.5">
              <span>🩺</span> Blood Pressure Trends (mmHg)
            </h4>
            <div className="flex gap-3 text-3xs font-extrabold uppercase">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> Systolic</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500"></span> Diastolic</span>
            </div>
          </div>
          <div className="relative">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
              {/* Grid lines */}
              {[4, 2, 0].map((step) => {
                const val = bpMin + (step / 4) * (bpMax - bpMin);
                const y = getY(val, bpMin, bpMax);
                return (
                  <g key={step} className="opacity-45">
                    <line x1={paddingL} y1={y} x2={w - paddingR} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={paddingL - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400">{Math.round(val)}</text>
                  </g>
                );
              })}

              {/* Systolic Line */}
              {(() => {
                const points = bpData.map((d, i) => `${getX(i, bpData.length)},${getY(d.sys!, bpMin, bpMax)}`).join(" ");
                return (
                  <>
                    <polyline fill="none" stroke="url(#sysGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} className="drop-shadow-xs" />
                    {bpData.map((d, i) => (
                      <g key={i}>
                        <circle cx={getX(i, bpData.length)} cy={getY(d.sys!, bpMin, bpMax)} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />
                        <title>{`Systolic: ${d.sys} mmHg on ${d.date}`}</title>
                      </g>
                    ))}
                  </>
                );
              })()}

              {/* Diastolic Line */}
              {(() => {
                const points = bpData.map((d, i) => `${getX(i, bpData.length)},${getY(d.dia!, bpMin, bpMax)}`).join(" ");
                return (
                  <>
                    <polyline fill="none" stroke="url(#diaGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
                    {bpData.map((d, i) => (
                      <g key={i}>
                        <circle cx={getX(i, bpData.length)} cy={getY(d.dia!, bpMin, bpMax)} r="4" fill="#0ea5e9" stroke="#fff" strokeWidth="1.5" />
                        <title>{`Diastolic: ${d.dia} mmHg on ${d.date}`}</title>
                      </g>
                    ))}
                  </>
                );
              })()}

              {/* X Axis Labels */}
              {bpData.map((d, i) => {
                const xVal = getX(i, bpData.length);
                const yVal = h - 8;
                return (
                  <text
                    key={i}
                    x={xVal}
                    y={yVal}
                    textAnchor="middle"
                    className="text-[9px] font-extrabold fill-slate-400"
                    transform={`rotate(12, ${xVal}, ${yVal})`}
                  >
                    {d.date.split(" ")[0]} {d.date.split(" ")[1]}
                  </text>
                );
              })}

              <defs>
                <linearGradient id="sysGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="diaGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
          No blood pressure trends available.
        </div>
      )}

      {/* Weight Trend Card */}
      {wData.length >= 2 ? (
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[var(--hh-purple)] flex items-center gap-1.5">
              <span>⚖️</span> Weight Trends (kg)
            </h4>
            <span className="text-3xs font-extrabold uppercase text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">Scale</span>
          </div>
          <div className="relative">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
              {/* Grid lines */}
              {[4, 2, 0].map((step) => {
                const val = wMin + (step / 4) * (wMax - wMin);
                const y = getY(val, wMin, wMax);
                return (
                  <g key={step} className="opacity-45">
                    <line x1={paddingL} y1={y} x2={w - paddingR} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                    <text x={paddingL - 8} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400">{Math.round(val)}</text>
                  </g>
                );
              })}

              {/* Weight Line */}
              {(() => {
                const points = wData.map((d, i) => `${getX(i, wData.length)},${getY(d.weight!, wMin, wMax)}`).join(" ");
                return (
                  <>
                    <polyline fill="none" stroke="url(#wGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
                    {wData.map((d, i) => (
                      <g key={i}>
                        <circle cx={getX(i, wData.length)} cy={getY(d.weight!, wMin, wMax)} r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                        <title>{`Weight: ${d.weight} kg on ${d.date}`}</title>
                      </g>
                    ))}
                  </>
                );
              })()}

              {/* X Axis Labels */}
              {wData.map((d, i) => {
                const xVal = getX(i, wData.length);
                const yVal = h - 8;
                return (
                  <text
                    key={i}
                    x={xVal}
                    y={yVal}
                    textAnchor="middle"
                    className="text-[9px] font-extrabold fill-slate-400"
                    transform={`rotate(12, ${xVal}, ${yVal})`}
                  >
                    {d.date.split(" ")[0]} {d.date.split(" ")[1]}
                  </text>
                );
              })}

              <defs>
                <linearGradient id="wGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-500">
          No weight trends available.
        </div>
      )}
    </div>
  );
}

function VitalsTab({ vitals, patient }: { vitals: Array<Vital & { visitLabel: string }>; patient: Patient }) {
  return (
    <ClinicalPanel title="Vitals history" icon={<HeartPulse size={17} />}>
      <VitalsTrendCharts vitals={vitals} />
      <div className="overflow-x-auto">
        <table className="hh-compact-table">
          <thead>
            <tr>
              <th>Recorded</th>
              <th>Visit</th>
              <th>BP</th>
              <th>Pulse</th>
              <th>Temp</th>
              <th>Weight</th>
              <th>Glucose</th>
              <th>Food</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vitals.map((vital) => {
              const bp = getBPStatus(vital.bp_first_reading, vital.bp_second_reading);
              const pulse = getPulseStatus(vital.pulse);
              const temp = getTempStatus(vital.temperature);
              const glucose = getGlucoseStatus(vital.glucose_mmol_l, vital.glucose_context);
              return (
                <tr key={vital.id}>
                  <td className="font-semibold text-slate-500 whitespace-nowrap">{formatDateTime(vital.recorded_at || vital.created_at)}</td>
                  <td className="font-semibold text-[var(--hh-purple-dark)]">{vital.visitLabel}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="font-extrabold">{value(vital.bp_first_reading)} / {value(vital.bp_second_reading)}</span>
                      {vital.bp_first_reading && (
                        <span className={`inline-block self-start rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${bp.badge}`}>
                          {bp.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{vital.pulse ? `${vital.pulse} bpm` : "--"}</span>
                      {vital.pulse && (
                        <span className={`inline-block self-start rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${pulse.badge}`}>
                          {pulse.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{vital.temperature ? `${vital.temperature} °C` : "--"}</span>
                      {vital.temperature && (
                        <span className={`inline-block self-start rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${temp.badge}`}>
                          {temp.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="font-semibold">{vital.weight ? `${vital.weight} kg` : "--"}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{vital.glucose_mmol_l ? `${vital.glucose_mmol_l} mmol/L` : "--"}</span>
                      {vital.glucose_mmol_l && (
                        <span className={`inline-block self-start rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${glucose.badge}`}>
                          {glucose.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[#1a221d]">{value(vital.glucose_food_type)}</span>
                      <span className="text-[10px] text-[#5c6a61] uppercase">{value(vital.glucose_context?.replaceAll("_", " "))}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <PatientVitalsDialog
                      patient={patient}
                      vital={vital}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs font-bold text-[var(--hh-purple)] hover:bg-[var(--hh-purple-light)] hover:text-[var(--hh-purple-dark)]"
                        >
                          Change
                        </Button>
                      }
                    />
                  </td>
                </tr>
              );
            })}
            {vitals.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-[#66736d]" colSpan={9}>No vitals have been recorded for this patient yet.</td>
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
  const router = useRouter();
  const setDocuments = onDocumentsChange;
  const [generating, setGenerating] = useState(false);
  const [invalidatingId, setInvalidatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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

  async function handleInvalidateConsent(docId: number) {
    if (!confirm("Are you sure you want to invalidate this consent form? It will be archived, and the patient must sign a new consent form before further clinical work.")) {
      return;
    }
    setInvalidatingId(docId);
    try {
      const response = await fetch(`/api/patient-documents/${docId}/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.detail || "Could not invalidate consent form.");
        return;
      }
      toast.success("Consent form invalidated successfully.");
      setDocuments(documents.map((d) => (d.id === docId ? { ...d, status: "invalidated" as const } : d)));
      router.refresh();
    } catch {
      toast.error("An error occurred. Check connection and try again.");
    } finally {
      setInvalidatingId(null);
    }
  }

  // Find active consent document (signed or verified)
  const activeConsent = documents.find(
    (d) => d.document_type === "consent_form" && (d.status === "signed" || d.status === "verified")
  );

  // Find pending / draft consent document (awaiting signature)
  const pendingConsent = documents.find(
    (d) => d.document_type === "consent_form" && (d.status === "pending_signature" || d.status === "generated")
  );

  const latestVisit = patient.visits?.[0];

  let isConsentExpired = false;
  let daysSinceLastVisit = 0;
  if (latestVisit && activeConsent?.signed_at) {
    const lastVisitDate = new Date(latestVisit.visit_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastVisitDate.getTime());
    daysSinceLastVisit = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastVisit > 30) {
      const consentSignedDate = new Date(activeConsent.signed_at);
      const lastVisitStr = latestVisit.visit_date;
      const consentSignedStr = consentSignedDate.toISOString().split("T")[0];
      if (consentSignedStr <= lastVisitStr) {
        isConsentExpired = true;
      }
    }
  }

  // Filter historical / past documents
  const historicalDocs = documents.filter((doc) => {
    if (activeConsent && doc.id === activeConsent.id && !isConsentExpired) {
      return false;
    }
    if (pendingConsent && doc.id === pendingConsent.id) {
      return false;
    }
    return true;
  });

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
        {/* Active Consent Form Section */}
        {activeConsent && !isConsentExpired ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Active Patient Consent Form</h4>
                  <p className="mt-1 text-xs text-emerald-800">
                    This patient has a signed, fully active consent form covering clinical interventions.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#53605a] font-medium">
                    <span><strong>Signed At:</strong> {activeConsent.signed_at ? new Date(activeConsent.signed_at).toLocaleString() : "N/A"}</span>
                    {activeConsent.generated_by_name && (
                      <span><strong>Witnessed By:</strong> {activeConsent.generated_by_name}</span>
                    )}
                    <span><strong>Status:</strong> <span className="capitalize font-bold text-emerald-700">{activeConsent.status}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 sm:self-center">
                <Button asChild variant="secondary" size="sm" className="border border-emerald-200 hover:bg-emerald-100 text-emerald-900 font-bold bg-white">
                  <a href={`/api/patient-documents/${activeConsent.id}/download?v=${Date.now()}`} target="_blank" rel="noreferrer">
                    <Download size={14} className="mr-1" />
                    Open PDF
                  </a>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleInvalidateConsent(activeConsent.id)}
                  disabled={invalidatingId === activeConsent.id}
                  className="font-bold text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {invalidatingId === activeConsent.id ? "Invalidating..." : "Invalidate Form"}
                </Button>
              </div>
            </div>
          </div>
        ) : isConsentExpired && activeConsent ? (
          /* Expired Consent Block */
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700 shrink-0 font-bold text-lg leading-none">
                  ⚠️
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Consent Form Expired (30-Day Visit Gap)</h4>
                  <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                    The patient's last recorded visit was on <strong>{latestVisit?.visit_date}</strong> ({daysSinceLastVisit} days ago). 
                    Because the visit gap exceeded 30 days, the prior consent form signed on {new Date(activeConsent.signed_at || "").toLocaleDateString()} has automatically expired.
                    A new consent form must be signed.
                  </p>
                </div>
              </div>
              <Button 
                type="button" 
                onClick={generateConsent} 
                disabled={generating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 sm:self-center"
              >
                <FileText size={14} className="mr-1" />
                {generating ? "Opening..." : "Generate New Consent"}
              </Button>
            </div>
          </div>
        ) : pendingConsent ? (
          /* Pending Consent Block */
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700 shrink-0">
                  <FileText size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-950">Consent Form Pending Signature</h4>
                  <p className="mt-1 text-xs text-indigo-800">
                    A consent form has been generated and is awaiting handwritten digital signature.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#53605a]">
                    <span><strong>Created:</strong> {new Date(pendingConsent.created_at).toLocaleString()}</span>
                    <span><strong>Status:</strong> <span className="capitalize font-bold text-indigo-700">{pendingConsent.status}</span></span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 sm:self-center">
                <ConsentSignatureDialog
                  document={pendingConsent}
                  patient={patient}
                  onSigned={(signedDocument) => setDocuments(documents.map((item) => (item.id === signedDocument.id ? signedDocument : item)))}
                />
                <Button asChild variant="secondary" size="sm" className="border border-indigo-200 hover:bg-indigo-100 text-indigo-900 bg-white font-bold">
                  <a href={`/api/patient-documents/${pendingConsent.id}/download?v=${Date.now()}`} target="_blank" rel="noreferrer">
                    <Download size={14} className="mr-1" />
                    Open PDF
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Generate Consent CTA */
          <div className="rounded-xl border border-dashed border-[var(--hh-border)] bg-slate-50/50 p-6 text-center">
            <FileText size={32} className="mx-auto text-[#a2b2ac]" />
            <h4 className="mt-2 text-sm font-bold text-[#111827]">No Active Consent Form Found</h4>
            <p className="mt-1 text-xs text-[#53605a] max-w-md mx-auto leading-relaxed">
              Before clinical visits, vitals, or medical histories can be registered, the patient must review and sign the standard clinic consent document.
            </p>
            <Button type="button" onClick={generateConsent} disabled={generating} className="mt-4 font-bold">
              <FileText size={14} className="mr-1" />
              {generating ? "Opening..." : "Generate Consent Form"}
            </Button>
          </div>
        )}

        {/* Expandable Historical Documents Table */}
        {historicalDocs.length > 0 && (
          <div className="mt-6 border-t border-[var(--hh-border)] pt-5">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--hh-border)] bg-white px-4 py-3 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-[#3f4d47]">📋</span>
                <span className="text-sm font-bold text-[#111827]">
                  Archived / Past Documents ({historicalDocs.length})
                </span>
              </div>
              <span className="text-[#66736d] text-xs font-semibold">
                {showHistory ? "Hide archived records" : "View archived records"}
              </span>
            </button>

            {showHistory && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--hh-border)] bg-white shadow-xs animate-fade-in">
                <table className="hh-compact-table w-full text-left">
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Signed At</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td className="font-bold">{doc.title}</td>
                        <td className="capitalize text-xs text-[#53605a]">
                          {doc.document_type_label || doc.document_type.replaceAll("_", " ")}
                        </td>
                        <td>
                          <Badge 
                            variant={
                              doc.status === "invalidated"
                                ? "outline"
                                : doc.status === "rejected"
                                ? "warning"
                                : "default"
                            }
                            className={`capitalize text-[10px] px-2 py-0.5 font-extrabold tracking-wide ${
                              doc.status === "invalidated"
                                ? "border-amber-300 text-amber-700 bg-amber-50"
                                : ""
                            }`}
                          >
                            {doc.status_label || doc.status.replaceAll("_", " ")}
                          </Badge>
                        </td>
                        <td className="text-xs text-[#66736d]">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-xs text-[#66736d]">
                          {doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="text-right">
                          <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-bold text-[var(--hh-purple)]">
                            <a href={`/api/patient-documents/${doc.id}/download?v=${encodeURIComponent(doc.updated_at || doc.status)}`} target="_blank" rel="noreferrer">
                              <Download size={12} className="mr-1" />
                              Open PDF
                            </a>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {documents.length === 0 && (
          <p className="p-4 text-sm text-[#66736d] text-center border rounded-lg border-dashed bg-slate-50/30">
            No documents have been uploaded or generated for this patient yet.
          </p>
        )}
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
  const notes = [
    {
      title: "📌 Key Clinical Notes",
      content: profile?.other_important_information || latestVisit?.main_complaint || "",
      bg: "bg-amber-50/70 border-amber-200 text-amber-950",
      accent: "bg-amber-400",
      tag: "ADMIN / WARNING",
    },
    {
      title: "💊 Allopathic Medications",
      content: profile?.allopathic_medication || "",
      bg: "bg-violet-50/70 border-violet-200 text-violet-950",
      accent: "bg-violet-400",
      tag: "PHARMACOLOGY",
    },
    {
      title: "🧬 Family Medical History",
      content: profile?.family_medical_history || "",
      bg: "bg-sky-50/70 border-sky-200 text-sky-950",
      accent: "bg-sky-400",
      tag: "HEREDITY",
    },
    {
      title: "📜 Past Medical History",
      content: profile?.past_medical_history || "",
      bg: "bg-emerald-50/70 border-emerald-200 text-emerald-950",
      accent: "bg-emerald-400",
      tag: "CHRONOLOGY",
    }
  ];

  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-[var(--hh-purple-dark)] uppercase tracking-wider">
          🗒️ Interactive Clinical Handovers & Notice Board
        </h3>
        <span className="text-3xs font-extrabold uppercase bg-[var(--hh-purple-light)] text-[var(--hh-purple-dark)] px-2.5 py-1 rounded-full border border-[var(--hh-purple)]">
          Collaborative Hub
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {notes.map((note, index) => {
          const hasContent = note.content && note.content !== "--" && note.content.trim() !== "";
          return (
            <div 
              key={index} 
              className={`relative overflow-hidden rounded-xl border p-5 shadow-2xs hover:shadow-md transition-all duration-300 hover:scale-[1.01] ${note.bg}`}
            >
              {/* Colored tag bar representing sticky look */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex">
                <div className={`h-full w-12 ${note.accent}`}></div>
                <div className="h-full flex-1 opacity-20 bg-slate-300"></div>
              </div>
              
              <div className="flex justify-between items-start mb-2.5 mt-1">
                <h4 className="text-sm font-black tracking-tight">{note.title}</h4>
                <span className="text-[9px] font-extrabold tracking-widest px-2 py-0.5 rounded-md bg-white/80 uppercase">
                  {note.tag}
                </span>
              </div>

              <div className="text-xs leading-relaxed font-medium">
                {hasContent ? (
                  <p className="whitespace-pre-wrap">{note.content}</p>
                ) : (
                  <p className="italic text-slate-400">No disclosures or notes recorded yet in this category.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LatestVitalsPanel({ vitals }: { vitals?: Vital & { visitLabel: string } }) {
  const [selectedVital, setSelectedVital] = useState<string | null>(null);

  if (!vitals) {
    return (
      <ClinicalPanel title="Latest vitals" icon={<HeartPulse size={17} />}>
        <p className="text-sm text-[#66736d]">No vitals recorded yet.</p>
      </ClinicalPanel>
    );
  }

  const bp = getBPStatus(vitals.bp_first_reading, vitals.bp_second_reading);
  const pulse = getPulseStatus(vitals.pulse);
  const temp = getTempStatus(vitals.temperature);
  const glucose = getGlucoseStatus(vitals.glucose_mmol_l, vitals.glucose_context);

  return (
    <ClinicalPanel title="Latest vitals dashboard" icon={<HeartPulse size={17} />}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        
        {/* Blood Pressure Card */}
        <div 
          onClick={() => setSelectedVital(selectedVital === "bp" ? null : "bp")}
          className={`group relative rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
            selectedVital === "bp" 
              ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20 shadow-xs" 
              : "border-[#d8e5dd] bg-white hover:border-emerald-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
              <HeartPulse size={18} />
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${bp.badge}`}>
              {bp.label}
            </span>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a221d] tracking-tight">
              {value(vitals.bp_first_reading)} / {value(vitals.bp_second_reading)} <span className="text-xs font-bold text-[#5c6a61]">mmHg</span>
            </div>
            <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
              Blood Pressure
            </div>
          </div>

          <div className="mt-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div className="h-full w-[45%] bg-emerald-500 rounded-l-full"></div>
              <div className="h-full w-[15%] bg-amber-300"></div>
              <div className="h-full w-[20%] bg-orange-400"></div>
              <div className="h-full w-[20%] bg-red-500 rounded-r-full"></div>
              <div 
                style={{ left: `${bp.pct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100 transition-all duration-500"
              ></div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
            <span className="font-semibold text-slate-500 text-[10px]">
              Recorded {formatDateTime(vitals.recorded_at || vitals.created_at)}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "bp" ? "rotate-180 text-emerald-600" : ""}`} />
          </div>

          {selectedVital === "bp" && (
            <div className="mt-3 text-xs bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-950 animate-fade-in">
              Optimal range is &lt; 120/80 mmHg. Review for trends of hypertension.
            </div>
          )}
        </div>

        {/* Heart Rate / Pulse Card */}
        <div 
          onClick={() => setSelectedVital(selectedVital === "hr" ? null : "hr")}
          className={`group relative rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
            selectedVital === "hr" 
              ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/20 shadow-xs" 
              : "border-[#d8e5dd] bg-white hover:border-rose-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors">
              <HeartPulse size={18} className="animate-pulse duration-1000" />
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${pulse.badge}`}>
              {pulse.label}
            </span>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a221d] tracking-tight">
              {vitals.pulse ? `${vitals.pulse}` : "--"} <span className="text-xs font-bold text-[#5c6a61]">bpm</span>
            </div>
            <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
              Heart Rate / Pulse
            </div>
          </div>

          <div className="mt-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div className="h-full w-[30%] bg-sky-400 rounded-l-full"></div>
              <div className="h-full w-[45%] bg-emerald-500"></div>
              <div className="h-full w-[25%] bg-rose-500 rounded-r-full"></div>
              <div 
                style={{ left: `${pulse.pct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100 transition-all duration-500"
              ></div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
            <span className="font-semibold text-slate-500 text-[10px]">
              Normal Rest Range: 60-100 bpm
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "hr" ? "rotate-180 text-rose-600" : ""}`} />
          </div>

          {selectedVital === "hr" && (
            <div className="mt-3 text-xs bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-950 animate-fade-in">
              Stable resting pulse indicates efficient cardiovascular fitness.
            </div>
          )}
        </div>

        {/* Temperature Card */}
        <div 
          onClick={() => setSelectedVital(selectedVital === "temp" ? null : "temp")}
          className={`group relative rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
            selectedVital === "temp" 
              ? "border-sky-400 ring-2 ring-sky-100 bg-sky-50/20 shadow-xs" 
              : "border-[#d8e5dd] bg-white hover:border-sky-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-100 transition-colors">
              <Thermometer size={18} />
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${temp.badge}`}>
              {temp.label}
            </span>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a221d] tracking-tight">
              {vitals.temperature ? `${vitals.temperature}` : "--"} <span className="text-xs font-bold text-[#5c6a61]">°C</span>
            </div>
            <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
              Temperature
            </div>
          </div>

          <div className="mt-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div className="h-full w-[25%] bg-blue-400 rounded-l-full"></div>
              <div className="h-full w-[35%] bg-emerald-500"></div>
              <div className="h-full w-[20%] bg-amber-400"></div>
              <div className="h-full w-[20%] bg-rose-500 rounded-r-full"></div>
              <div 
                style={{ left: `${temp.pct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100 transition-all duration-500"
              ></div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
            <span className="font-semibold text-slate-500 text-[10px]">
              Normal range is 36.1 - 37.2 °C
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "temp" ? "rotate-180 text-sky-600" : ""}`} />
          </div>

          {selectedVital === "temp" && (
            <div className="mt-3 text-xs bg-sky-50 border border-sky-100 p-2.5 rounded-lg text-sky-950 animate-fade-in">
              Review body temperature to evaluate acute, sub-acute, or inflammatory triggers.
            </div>
          )}
        </div>

        {/* Weight Card */}
        <div 
          onClick={() => setSelectedVital(selectedVital === "weight" ? null : "weight")}
          className={`group relative rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
            selectedVital === "weight" 
              ? "border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/20 shadow-xs" 
              : "border-[#d8e5dd] bg-white hover:border-indigo-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <Scale size={18} />
            </div>
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
              Stable
            </span>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a221d] tracking-tight">
              {vitals.weight ? `${vitals.weight}` : "--"} <span className="text-xs font-bold text-[#5c6a61]">kg</span>
            </div>
            <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
              Weight
            </div>
          </div>

          <div className="mt-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div className="h-full w-full bg-emerald-500 rounded-full"></div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
            <span className="font-semibold text-slate-500 text-[10px]">
              Respiration: {vitals.resp_rate ? `${vitals.resp_rate} / min` : "--"}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "weight" ? "rotate-180 text-indigo-600" : ""}`} />
          </div>

          {selectedVital === "weight" && (
            <div className="mt-3 text-xs bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-indigo-950 animate-fade-in">
              Consistent monitoring evaluates nutritional stability and systemic hydration.
            </div>
          )}
        </div>

        {/* Blood Glucose Card */}
        <div 
          onClick={() => setSelectedVital(selectedVital === "glucose" ? null : "glucose")}
          className={`group relative rounded-xl border p-4 transition-all duration-300 cursor-pointer ${
            selectedVital === "glucose" 
              ? "border-violet-400 ring-2 ring-violet-100 bg-violet-50/20 shadow-xs" 
              : "border-[#d8e5dd] bg-white hover:border-violet-300 hover:shadow-md"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 group-hover:bg-violet-100 transition-colors">
              <Activity size={18} />
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${glucose.badge}`}>
              {glucose.label}
            </span>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl font-black text-[#1a221d] tracking-tight">
              {vitals.glucose_mmol_l ? `${vitals.glucose_mmol_l}` : "--"} <span className="text-xs font-bold text-[#5c6a61]">mmol/L</span>
            </div>
            <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
              Glucose ({value(vitals.glucose_context?.replaceAll("_", " "))})
            </div>
          </div>

          <div className="mt-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div className="h-full w-[20%] bg-rose-400 rounded-l-full"></div>
              <div className="h-full w-[35%] bg-emerald-500"></div>
              <div className="h-full w-[20%] bg-amber-400"></div>
              <div className="h-full w-[25%] bg-rose-600 rounded-r-full"></div>
              <div 
                style={{ left: `${glucose.pct}%` }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100 transition-all duration-500"
              ></div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
            <span className="font-semibold text-slate-500 text-[10px]">
              Food Type: {value(vitals.glucose_food_type)}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "glucose" ? "rotate-180 text-violet-600" : ""}`} />
          </div>

          {selectedVital === "glucose" && (
            <div className="mt-3 text-xs bg-violet-50 border border-violet-100 p-2.5 rounded-lg text-violet-950 animate-fade-in">
              Diabetes fasting limit is &ge; 7.0 mmol/L and fed limit is &ge; 11.1 mmol/L. Monitor diet.
            </div>
          )}
        </div>

      </div>
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

function ProcessMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-2.5 text-center">
      <div className="text-[10px] font-bold uppercase text-[#66736d]">{label}</div>
      <div className="mt-1 text-xs font-extrabold text-[var(--hh-purple-dark)]">{value}</div>
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
          <div className="mt-1 text-sm capitalize text-[#1f2933] font-semibold">{text}</div>
        </div>
      ))}
    </div>
  );
}
