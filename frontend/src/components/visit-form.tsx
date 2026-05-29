"use client";

import { Eye, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Patient, Visit } from "@/types/clinic";

function formatDate(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(text));
}

function previousComplaint(visit?: Visit) {
  return visit?.initial_complaints || visit?.main_complaint || "";
}

export function VisitForm({
  patients,
  patientId,
  defaultVisitType = "new_consultation",
  error: initialError
}: {
  patients: Patient[];
  patientId?: string;
  defaultVisitType?: string;
  error?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError || null);
  const [loading, setLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");
  const [visitType, setVisitType] = useState(defaultVisitType);
  const [patientDetail, setPatientDetail] = useState<Patient | null>(null);
  const [mainComplaint, setMainComplaint] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const isFollowUp = visitType === "follow_up";

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientDetail(null);
      return;
    }

    const controller = new AbortController();
    async function loadPatient() {
      try {
        const response = await fetch(`/api/patients/${encodeURIComponent(selectedPatientId)}`, { signal: controller.signal });
        if (response.ok) {
          setPatientDetail((await response.json()) as Patient);
        }
      } catch {
        if (!controller.signal.aborted) setPatientDetail(null);
      }
    }
    loadPatient();
    return () => controller.abort();
  }, [selectedPatientId]);

  const previousVisits = patientDetail?.visits || [];
  const previousVisit = previousVisits[0];
  const priorComplaint = previousComplaint(previousVisit);

  useEffect(() => {
    if (isFollowUp && priorComplaint) {
      setMainComplaint(priorComplaint);
    }
  }, [isFollowUp, priorComplaint]);

  const remedyEvaluations = useMemo(
    () =>
      previousVisits
        .filter((visit) => visit.remedy || visit.follow_up_evaluation?.evaluation_notes)
        .map((visit) => ({
          id: visit.id,
          date: visit.visit_date,
          remedy: visit.remedy || "--",
          evaluation: visit.follow_up_evaluation?.evaluation_notes || visit.reason_for_remedy || "--"
        })),
    [previousVisits]
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    function val(key: string) {
      return String(form.get(key) || "").trim();
    }

    const body = {
      patient: Number(val("patient")),
      visit_type: val("visit_type") || "new_consultation",
      visit_date: val("visit_date"),
      visit_time: val("visit_time") || null,
      main_complaint: val("main_complaint"),
      initial_complaints: isFollowUp ? "" : val("initial_complaints"),
      physical_examination: val("physical_examination"),
      diagnosis: val("diagnosis"),
      remedy: val("remedy"),
      reason_for_remedy: val("reason_for_remedy"),
      dietary_recommendation: val("dietary_recommendation"),
      lifestyle_recommendation: val("lifestyle_recommendation"),
      ...(isFollowUp
        ? {
            follow_up_evaluation: {
              previous_consult_symptoms: val("previous_consult_symptoms"),
              dietary_changes: val("dietary_changes"),
              lifestyle_changes: val("lifestyle_changes"),
              exercise_notes: val("exercise_notes"),
              energy_notes: val("energy_notes"),
              evaluation_notes: val("evaluation_notes")
            }
          }
        : {})
    };

    const res = await fetch("/api/visits/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.success) {
      toast.success("Visit saved");
      router.push("/visits");
    } else {
      setError("save_failed");
      toast.error("The visit could not be saved");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          The visit could not be saved. Choose a patient, visit date, and main complaint.
        </div>
      )}

      <section className="hh-panel p-5">
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Visit details</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="hh-label">Patient</span>
            <select className="hh-input" name="patient" value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.currentTarget.value)} required>
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.full_name_display} - {patient.patient_code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="hh-label">Visit type</span>
            <select className="hh-input" name="visit_type" value={visitType} onChange={(event) => setVisitType(event.currentTarget.value)}>
              <option value="new_consultation">New consultation</option>
              <option value="follow_up">Follow up</option>
              <option value="review">Review</option>
            </select>
          </label>
          <label>
            <span className="hh-label">Visit date</span>
            <input className="hh-input" name="visit_date" type="date" defaultValue={today} required />
          </label>
          <label>
            <span className="hh-label">Visit time</span>
            <input className="hh-input" name="visit_time" type="time" />
          </label>
          <label className="md:col-span-2">
            <span className="hh-label">{isFollowUp ? "Previous complaint / case" : "Main complaint"}</span>
            <input className="hh-input" name="main_complaint" value={mainComplaint} onChange={(event) => setMainComplaint(event.currentTarget.value)} readOnly={isFollowUp && Boolean(priorComplaint)} required />
          </label>
        </div>
      </section>

      {isFollowUp && (
        <section className="hh-panel p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase text-[#66736d]">Follow-up context</h2>
              <p className="mt-2 text-sm leading-6 text-[#53605a]">
                The previous complaint is pulled into this visit. Previous diagnosis, remedy, and recommendations are hidden until opened for review.
              </p>
            </div>
            <PreviousClinicalContext previousVisit={previousVisit} />
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--hh-border)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7faf8] text-xs uppercase text-[#66736d]">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Remedy</th>
                  <th className="px-3 py-2">Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {remedyEvaluations.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--hh-border)]">
                    <td className="px-3 py-3">{formatDate(row.date)}</td>
                    <td className="px-3 py-3">{row.remedy}</td>
                    <td className="px-3 py-3">{row.evaluation}</td>
                  </tr>
                ))}
                {remedyEvaluations.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-[#66736d]" colSpan={3}>
                      No previous remedy evaluation history is available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="hh-panel p-5">
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">{isFollowUp ? "Evaluation (follow up)" : "Clinical notes"}</h2>
        {isFollowUp ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="hh-label">Symptoms of previous consult</span><textarea className="hh-input min-h-28" name="previous_consult_symptoms" /></label>
            <label><span className="hh-label">Evaluation</span><textarea className="hh-input min-h-28" name="evaluation_notes" /></label>
            <label><span className="hh-label">Dietary changes</span><textarea className="hh-input min-h-20" name="dietary_changes" /></label>
            <label><span className="hh-label">Lifestyle changes</span><textarea className="hh-input min-h-20" name="lifestyle_changes" /></label>
            <label><span className="hh-label">Exercise</span><textarea className="hh-input min-h-20" name="exercise_notes" /></label>
            <label><span className="hh-label">Energy</span><textarea className="hh-input min-h-20" name="energy_notes" /></label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="hh-label">Initial complaints</span><textarea className="hh-input min-h-28" name="initial_complaints" /></label>
            <label><span className="hh-label">Physical examination</span><textarea className="hh-input min-h-28" name="physical_examination" /></label>
            <label><span className="hh-label">Diagnosis</span><textarea className="hh-input min-h-28" name="diagnosis" /></label>
            <label><span className="hh-label">Remedy</span><textarea className="hh-input min-h-28" name="remedy" /></label>
            <label><span className="hh-label">Reason for remedy</span><textarea className="hh-input min-h-28" name="reason_for_remedy" /></label>
            <label><span className="hh-label">Dietary recommendation</span><textarea className="hh-input min-h-28" name="dietary_recommendation" /></label>
            <label><span className="hh-label">Lifestyle recommendation</span><textarea className="hh-input min-h-28" name="lifestyle_recommendation" /></label>
          </div>
        )}
      </section>

      {isFollowUp && (
        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">New clinical decision</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="hh-label">Physical examination</span><textarea className="hh-input min-h-28" name="physical_examination" /></label>
            <label><span className="hh-label">New diagnosis</span><textarea className="hh-input min-h-28" name="diagnosis" /></label>
            <label><span className="hh-label">New remedy</span><textarea className="hh-input min-h-28" name="remedy" /></label>
            <label><span className="hh-label">Reason for remedy</span><textarea className="hh-input min-h-28" name="reason_for_remedy" /></label>
            <label><span className="hh-label">Dietary recommendation</span><textarea className="hh-input min-h-28" name="dietary_recommendation" /></label>
            <label><span className="hh-label">Lifestyle recommendation</span><textarea className="hh-input min-h-28" name="lifestyle_recommendation" /></label>
          </div>
        </section>
      )}

      <div>
        <LoadingButton type="submit" loading={loading} loadingText="Saving visit...">
          {!loading && <Save size={17} />}
          Save visit
        </LoadingButton>
      </div>
    </form>
  );
}

function PreviousClinicalContext({ previousVisit }: { previousVisit?: Visit }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" disabled={!previousVisit}>
          <Eye size={16} />
          View previous clinical info
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(94vw,760px)]">
        <div className="border-b border-[var(--hh-border)] px-5 py-4 pr-14">
          <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">Previous diagnosis, remedy, and recommendations</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#66736d]">
            These are shown for reference only. The current follow-up fields remain empty for new information.
          </DialogDescription>
        </div>
        <div className="grid gap-4 p-5">
          {previousVisit ? (
            <>
              <InfoRow label="Previous visit" value={`${formatDate(previousVisit.visit_date)} - ${previousVisit.visit_type.replaceAll("_", " ")}`} />
              <InfoRow label="Complaint" value={previousComplaint(previousVisit)} />
              <InfoRow label="Diagnosis" value={previousVisit.diagnosis || "--"} />
              <InfoRow label="Remedy" value={previousVisit.remedy || "--"} />
              <InfoRow label="Reason for remedy" value={previousVisit.reason_for_remedy || "--"} />
              <InfoRow label="Dietary recommendation" value={previousVisit.dietary_recommendation || "--"} />
              <InfoRow label="Lifestyle recommendation" value={previousVisit.lifestyle_recommendation || "--"} />
            </>
          ) : (
            <p className="text-sm text-[#66736d]">No previous visit is available for this patient.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-3">
      <div className="text-xs font-bold uppercase text-[#66736d]">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#1f2933]">{value}</div>
    </div>
  );
}
