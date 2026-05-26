"use client";

import Link from "next/link";
import { Check, ClipboardList, Download, Eye, FileText, HeartPulse, ListChecks, LockKeyhole, PenLine, Printer, ShieldCheck, Stethoscope, UserRound, X } from "lucide-react";
import SignaturePad from "signature_pad";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ActionErrorDialog } from "@/components/action-error-dialog";
import { ClinicalPanel } from "@/components/clinical-panel";
import { PatientAppointmentDialog } from "@/components/patient-appointment-dialog";
import { PatientVitalsDialog } from "@/components/patient-vitals-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import { relationshipLabel } from "@/lib/relationships";
import type { Patient, PatientDocument, Visit, Vital } from "@/types/clinic";

const recordTabs = [
  { key: "overview", label: "Overview" },
  { key: "complaints", label: "Complaints" },
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

export function PatientRecordWorkspace({ patient, canCreateVisit }: { patient: Patient; canCreateVisit: boolean }) {
  const [activeTab, setActiveTab] = useState<RecordTab>("overview");
  const latestVisit = patient.visits?.[0];
  const latestVitals = allVitals(patient)[0];

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
        {canCreateVisit && (
          <Button asChild>
            <Link className="!text-white" href={`/visits/new?patient=${patient.id}`}>
              <ClipboardList size={16} />
              New visit note
            </Link>
          </Button>
        )}
        {canCreateVisit && <PatientVitalsDialog patient={patient} />}
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
        {activeTab === "overview" && <OverviewTab patient={patient} latestVisit={latestVisit} latestVitals={latestVitals} />}
        {activeTab === "complaints" && <ComplaintsTab visits={patient.visits || []} />}
        {activeTab === "assessments" && <AssessmentsTab visits={patient.visits || []} />}
        {activeTab === "diagnosis" && <DiagnosisTab visits={patient.visits || []} clinicalAccess={patient.clinical_access} />}
        {activeTab === "remedies" && <RemediesTab visits={patient.visits || []} />}
        {activeTab === "vitals" && <VitalsTab vitals={allVitals(patient)} />}
        {activeTab === "follow_ups" && <FollowUpsTab visits={patient.visits || []} />}
        {activeTab === "documents" && <DocumentsTab patient={patient} />}
        {activeTab === "notes" && <NotesTab patient={patient} latestVisit={latestVisit} />}
      </section>
    </>
  );
}

function OverviewTab({ patient, latestVisit, latestVitals }: { patient: Patient; latestVisit?: Visit; latestVitals?: Vital & { visitLabel: string } }) {
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
      <LatestVitalsPanel vitals={latestVitals} />
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

function ComplaintsTab({ visits }: { visits: Visit[] }) {
  return (
    <ClinicalPanel title="Complaints history" icon={<ClipboardList size={17} />}>
      <RecordList
        emptyText="No complaints have been recorded for this patient yet."
        rows={visits.map((visit) => ({
          id: visit.id,
          title: visit.main_complaint || "Complaint",
          meta: `${formatDate(visit.visit_date)} - ${visit.visit_type.replaceAll("_", " ")}`,
          body: visit.initial_complaints || visit.main_complaint
        }))}
      />
    </ClinicalPanel>
  );
}

function AssessmentsTab({ visits }: { visits: Visit[] }) {
  return (
    <ClinicalPanel title="Assessment history" icon={<Stethoscope size={17} />}>
      <RecordList
        emptyText="No assessments have been recorded for this patient yet."
        rows={visits
          .filter((visit) => visit.physical_examination)
          .map((visit) => ({
            id: visit.id,
            title: visit.main_complaint || "Assessment",
            meta: formatDate(visit.visit_date),
            body: visit.physical_examination
          }))}
      />
    </ClinicalPanel>
  );
}

function DiagnosisTab({ visits, clinicalAccess }: { visits: Visit[]; clinicalAccess?: string }) {
  if (clinicalAccess !== "active") {
    return (
      <ClinicalPanel title="Diagnosis history" icon={<LockKeyhole size={17} />}>
        <LockedClinicalNotice />
      </ClinicalPanel>
    );
  }
  return (
    <ClinicalPanel title="Diagnosis history" icon={<ShieldCheck size={17} />}>
      <RecordList
        emptyText="No diagnoses have been recorded for this patient yet."
        rows={visits
          .filter((visit) => visit.diagnosis)
          .map((visit) => ({
            id: visit.id,
            title: visit.diagnosis || "Diagnosis",
            meta: `${formatDate(visit.visit_date)} - ${visit.main_complaint}`,
            body: visit.reason_for_remedy
          }))}
      />
    </ClinicalPanel>
  );
}

function RemediesTab({ visits }: { visits: Visit[] }) {
  return (
    <ClinicalPanel title="Remedy history" icon={<Stethoscope size={17} />}>
      <div className="divide-y divide-[var(--hh-border)]">
        {visits.filter((visit) => visit.remedy || visit.dietary_recommendation || visit.lifestyle_recommendation).map((visit) => (
          <div key={visit.id} className="grid gap-3 py-4 first:pt-0 last:pb-0">
            <div>
              <div className="font-bold">{value(visit.remedy)}</div>
              <div className="mt-1 text-xs font-bold uppercase text-[#66736d]">{formatDate(visit.visit_date)}</div>
            </div>
            <InfoGrid
              rows={[
                ["Reason", value(visit.reason_for_remedy)],
                ["Dietary recommendation", value(visit.dietary_recommendation)],
                ["Lifestyle recommendation", value(visit.lifestyle_recommendation)],
                ["Complaint", value(visit.main_complaint)]
              ]}
            />
          </div>
        ))}
        {visits.filter((visit) => visit.remedy || visit.dietary_recommendation || visit.lifestyle_recommendation).length === 0 && (
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

function FollowUpsTab({ visits }: { visits: Visit[] }) {
  return (
    <ClinicalPanel title="Follow-up history" icon={<ClipboardList size={17} />}>
      <RecordList
        emptyText="No follow-up visits have been recorded for this patient yet."
        rows={visits
          .filter((visit) => visit.visit_type === "follow_up")
          .map((visit) => ({
            id: visit.id,
            title: visit.main_complaint || "Follow-up",
            meta: formatDate(visit.visit_date),
            body: visit.lifestyle_recommendation || visit.dietary_recommendation || visit.remedy
          }))}
      />
    </ClinicalPanel>
  );
}

function DocumentsTab({ patient }: { patient: Patient }) {
  const [documents, setDocuments] = useState(patient.documents || []);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeConsentDocument = documents.find((document) => document.document_type === "consent_form" && document.status !== "rejected");

  async function generateConsent() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${patient.public_id}/documents/consent`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.detail || "Consent form could not be generated. Please try again or refresh the patient record.");
        return;
      }
      setDocuments((current) => [data, ...current.filter((document) => document.id !== data.id)]);
      toast.success(response.status === 201 ? "Consent form generated" : "Existing consent form opened");
      window.open(`/api/patient-documents/${data.id}/download`, "_blank", "noopener,noreferrer");
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
                    onSigned={(signedDocument) => setDocuments((current) => current.map((item) => (item.id === signedDocument.id ? signedDocument : item)))}
                  />
                )}
                <Button asChild variant="secondary" size="sm">
                  <a href={`/api/patient-documents/${document.id}/download`} target="_blank" rel="noreferrer">
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
      window.open(`/api/patient-documents/${data.id}/download`, "_blank", "noopener,noreferrer");
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

function NotesTab({ patient, latestVisit }: { patient: Patient; latestVisit?: Visit }) {
  return (
    <ClinicalPanel title="Patient notes" icon={<ClipboardList size={17} />}>
      <InfoGrid
        rows={[
          ["Key notes", value(patient.profile?.other_important_information || latestVisit?.main_complaint)],
          ["Allopathic medication", value(patient.profile?.allopathic_medication)],
          ["Family medical history", value(patient.profile?.family_medical_history)],
          ["Past medical history", value(patient.profile?.past_medical_history)]
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

function ConfidentialRecords({ patient }: { patient: Patient }) {
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

function ConditionSummary({ conditions }: { conditions: Patient["conditions"] }) {
  const conditionMap = new Map((conditions || []).map((condition) => [condition.condition_code, condition.present]));

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {CONFIDENTIAL_CONDITIONS.map((condition) => {
        const present = conditionMap.get(condition.code) ?? false;
        return (
          <div key={condition.code} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--hh-border)] bg-white px-3 py-2">
            <span className="text-sm font-semibold">{condition.label}</span>
            <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${present ? "bg-[var(--hh-green)] text-white" : "bg-slate-100 text-slate-600"}`} aria-label={present ? "Yes" : "No"}>
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
