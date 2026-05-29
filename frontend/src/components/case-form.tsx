"use client";

import { ChevronDown, ChevronUp, Eye, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Case, Patient, Visit } from "@/types/clinic";

function formatDate(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(text));
}

function formatDateTime(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(text));
}

export function CaseForm({
  patients,
  patientId,
  parentCase,
  selectedPatient: initialPatient
}: {
  patients: Patient[];
  patientId?: string;
  parentCase?: Case | null;
  selectedPatient?: Patient | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");
  const [selectedVisitId, setSelectedVisitId] = useState("");
  const [patientDetail, setPatientDetail] = useState<Patient | null>(initialPatient || null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [parentExpanded, setParentExpanded] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const isFollowUp = Boolean(parentCase);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetail(null);
      setVisits([]);
      setSelectedVisitId("");
      return;
    }

    const controller = new AbortController();
    async function loadPatient() {
      try {
        const response = await fetch(`/api/patients/${encodeURIComponent(selectedPatientId)}`, { signal: controller.signal });
        if (response.ok) {
          const patient = (await response.json()) as Patient;
          setPatientDetail(patient);
          const patientVisits = patient.visits || [];
          setVisits(patientVisits);
          if (patientVisits.length > 0 && !selectedVisitId) {
            setSelectedVisitId(String(patientVisits[0].id));
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          setPatientDetail(null);
          setVisits([]);
        }
      }
    }
    loadPatient();
    return () => controller.abort();
  }, [selectedPatientId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    function val(key: string) {
      return String(form.get(key) || "").trim();
    }

    const body: Record<string, unknown> = {
      patient: Number(val("patient")),
      visit: Number(val("visit")),
      title: val("title"),
      main_complaint: val("main_complaint"),
      physical_examination: val("physical_examination"),
      diagnosis: val("diagnosis"),
      remedy: val("remedy"),
      reason_for_remedy: val("reason_for_remedy"),
      dietary_recommendation: val("dietary_recommendation"),
      lifestyle_recommendation: val("lifestyle_recommendation"),
      notes: val("notes")
    };

    if (parentCase) {
      body.parent_case = parentCase.id;
      body.previous_consult_symptoms = val("previous_consult_symptoms");
      body.dietary_changes = val("dietary_changes");
      body.lifestyle_changes = val("lifestyle_changes");
      body.exercise_notes = val("exercise_notes");
      body.energy_notes = val("energy_notes");
      body.evaluation_notes = val("evaluation_notes");
    }

    if (!body.patient || !body.visit || !body.title) {
      setError("Patient, visit, and case title are required.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/cases/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(isFollowUp ? "Follow-up case saved" : "Case saved");
        router.push(`/patients/${data.patient}`);
      } else {
        const detail = data.detail || data.title?.[0] || "Could not save case";
        setError(detail);
        toast.error(detail);
      }
    } catch {
      setError("Could not save case. Check the connection and try again.");
      toast.error("Could not save case");
    } finally {
      setLoading(false);
    }
  }

  function handlePatientChange(value: string) {
    setSelectedPatientId(value);
    setSelectedVisitId("");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className="hh-panel p-5">
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Case details</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="hh-label">Patient</span>
            <select className="hh-input" name="patient" value={selectedPatientId} onChange={(e) => handlePatientChange(e.currentTarget.value)} required>
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name_display} - {patient.patient_code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="hh-label">Visit</span>
            <select className="hh-input" name="visit" value={selectedVisitId} onChange={(e) => setSelectedVisitId(e.currentTarget.value)} required>
              <option value="">Select visit</option>
              {visits.map((visit) => (
                <option key={visit.id} value={visit.id}>
                  {formatDate(visit.visit_date)} - {visit.visit_type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="hh-label">Case title</span>
            <input className="hh-input" name="title" placeholder="e.g. Chronic headache assessment" required />
          </label>
        </div>
      </section>

      {isFollowUp && parentCase && (
        <section className="hh-panel p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase text-[#66736d]">Follow-up context</h2>
              <p className="mt-2 text-sm leading-6 text-[#53605a]">
                This case is linked to &ldquo;{parentCase.title}&rdquo; as a follow-up. The original case details are shown for reference.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setParentExpanded(!parentExpanded)}>
              {parentExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {parentExpanded ? "Hide parent case" : "View parent case"}
            </Button>
          </div>
          {parentExpanded && (
            <div className="mt-4 grid gap-3 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {parentCase.main_complaint && (
                  <div>
                    <div className="text-xs font-bold uppercase text-[#66736d]">Main complaint</div>
                    <div className="mt-0.5 text-sm text-[#1f2933]">{parentCase.main_complaint}</div>
                  </div>
                )}
                {parentCase.diagnosis && (
                  <div>
                    <div className="text-xs font-bold uppercase text-[#66736d]">Diagnosis</div>
                    <div className="mt-0.5 text-sm font-bold text-[#1f2933]">{parentCase.diagnosis}</div>
                  </div>
                )}
              </div>
              {parentCase.remedy && (
                <div>
                  <div className="text-xs font-bold uppercase text-[#66736d]">Remedy</div>
                  <div className="mt-0.5 text-sm text-[#1f2933]">{parentCase.remedy}</div>
                </div>
              )}
              {(parentCase.dietary_recommendation || parentCase.lifestyle_recommendation) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {parentCase.dietary_recommendation && (
                    <div>
                      <div className="text-xs font-bold uppercase text-[#66736d]">Dietary recommendation</div>
                      <div className="mt-0.5 text-sm text-[#1f2933]">{parentCase.dietary_recommendation}</div>
                    </div>
                  )}
                  {parentCase.lifestyle_recommendation && (
                    <div>
                      <div className="text-xs font-bold uppercase text-[#66736d]">Lifestyle recommendation</div>
                      <div className="mt-0.5 text-sm text-[#1f2933]">{parentCase.lifestyle_recommendation}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="hh-panel p-5">
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">{isFollowUp ? "Current evaluation" : "Clinical notes"}</h2>
        <div className="grid gap-4">
          <label>
            <span className="hh-label">Main complaint</span>
            <textarea className="hh-input min-h-20" name="main_complaint" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="hh-label">Physical examination</span><textarea className="hh-input min-h-28" name="physical_examination" /></label>
            <label><span className="hh-label">Diagnosis</span><textarea className="hh-input min-h-28" name="diagnosis" /></label>
            <label><span className="hh-label">Remedy</span><textarea className="hh-input min-h-28" name="remedy" /></label>
            <label><span className="hh-label">Reason for remedy</span><textarea className="hh-input min-h-28" name="reason_for_remedy" /></label>
            <label><span className="hh-label">Dietary recommendation</span><textarea className="hh-input min-h-28" name="dietary_recommendation" /></label>
            <label><span className="hh-label">Lifestyle recommendation</span><textarea className="hh-input min-h-28" name="lifestyle_recommendation" /></label>
          </div>
        </div>
      </section>

      {isFollowUp && (
        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Follow-up evaluation</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="hh-label">Symptoms since previous consult</span><textarea className="hh-input min-h-28" name="previous_consult_symptoms" /></label>
            <label><span className="hh-label">Evaluation notes</span><textarea className="hh-input min-h-28" name="evaluation_notes" /></label>
            <label><span className="hh-label">Dietary changes</span><textarea className="hh-input min-h-20" name="dietary_changes" /></label>
            <label><span className="hh-label">Lifestyle changes</span><textarea className="hh-input min-h-20" name="lifestyle_changes" /></label>
            <label><span className="hh-label">Exercise notes</span><textarea className="hh-input min-h-20" name="exercise_notes" /></label>
            <label><span className="hh-label">Energy notes</span><textarea className="hh-input min-h-20" name="energy_notes" /></label>
          </div>
        </section>
      )}

      <section className="hh-panel p-5">
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Additional notes</h2>
        <label>
          <span className="hh-label">Notes</span>
          <textarea className="hh-input min-h-20" name="notes" placeholder="Any additional observations or instructions..." />
        </label>
      </section>

      <div>
        <LoadingButton type="submit" loading={loading} loadingText="Saving case...">
          {!loading && <Save size={17} />}
          {isFollowUp ? "Save follow-up case" : "Save case"}
        </LoadingButton>
      </div>
    </form>
  );
}
