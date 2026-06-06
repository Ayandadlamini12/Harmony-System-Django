"use client";

import { CalendarCheck, Check, ChevronLeft, ChevronRight, ClipboardList, Eye, FileText, HeartPulse, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getDraftKey, isDraftExpired } from "@/lib/draft-utils";

import { FormStepWheel } from "@/components/form-step-wheel";
import { FormSectionHeader } from "@/components/form-section-header";
import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { showActionError } from "@/lib/action-error";
import type { Patient, Visit } from "@/types/clinic";

type SymptomProblemRow = {
  key: string;
  id?: number;
  description: string;
  note: string;
  status: "open" | "resolved";
};

type RemedyRow = {
  key: string;
  name: string;
  instructions: string;
  reason: string;
};

function formatDate(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(text));
}

function previousComplaint(visit?: Visit) {
  return visit?.initial_complaints || visit?.main_complaint || "";
}

function extractSubmitError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "The visit could not be saved.";
  const record = payload as Record<string, unknown>;
  return String(record.detail || record.error || "The visit could not be saved.");
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
  const [symptomProblems, setSymptomProblems] = useState<SymptomProblemRow[]>([
    { key: "new-0", description: "", note: "", status: "open" }
  ]);
  const [remedies, setRemedies] = useState<RemedyRow[]>([
    { key: "new-rem-0", name: "", instructions: "", reason: "" }
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const searchParams = useSearchParams();
  const [formKey, setFormKey] = useState(0);
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);
  const [lastSavedText, setLastSavedText] = useState<string | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function performRestore(parsed: any) {
    if (!parsed) return;
    try {
      if (parsed.visitType) setVisitType(parsed.visitType);
      if (parsed.mainComplaint) setMainComplaint(parsed.mainComplaint);
      if (parsed.symptomProblems) setSymptomProblems(parsed.symptomProblems);
      if (parsed.remedies) setRemedies(parsed.remedies);
      if (typeof parsed.activeStepIndex === "number") {
        setActiveStepIndex(parsed.activeStepIndex);
      }
      if (parsed.formFields) {
        setInitialValues(parsed.formFields);
        setFormKey((key) => key + 1);
      }
      setShowRestoreBanner(false);
      const timeStr = parsed.timestamp ? new Date(parsed.timestamp).toLocaleTimeString() : "";
      setLastSavedText(`Draft restored (saved ${timeStr})`);
      toast.success("Visit draft restored");
    } catch (err) {
      console.error("Error restoring draft:", err);
      toast.error("Failed to restore draft");
    }
  }

  function handleDiscardDraft() {
    if (typeof window === "undefined") return;
    const draftKey = getDraftKey(selectedPatientId);
    localStorage.removeItem(draftKey);
    setShowRestoreBanner(false);
    setDraftTime(null);
    setLastSavedText(null);
    toast.success("Draft discarded");
  }

  function saveDraftToLocalStorage(formElement: HTMLFormElement, isManual = false) {
    if (typeof window === "undefined") return;

    const form = new FormData(formElement);
    const fields: Record<string, string> = {};
    form.forEach((value, key) => {
      if (typeof value === "string") {
        fields[key] = value;
      }
    });

    const isDirty =
      mainComplaint.trim().length > 0 ||
      symptomProblems.some((p) => p.description.trim().length > 0) ||
      remedies.some((r) => r.name.trim().length > 0) ||
      Object.entries(fields).some(([key, val]) => {
        if (["patient", "visit_type", "visit_date", "visit_time"].includes(key)) return false;
        return val.trim().length > 0;
      });

    if (!isDirty && !isManual) return;

    const draftPayload = {
      visitType,
      selectedPatientId,
      mainComplaint,
      symptomProblems,
      remedies,
      activeStepIndex,
      timestamp: new Date().toISOString(),
      formFields: fields
    };

    const draftKey = getDraftKey(selectedPatientId);
    localStorage.setItem(draftKey, JSON.stringify(draftPayload));

    const timeString = new Date().toLocaleTimeString();
    setLastSavedText(`Draft auto-saved at ${timeString}`);

    if (isManual) {
      toast.success(`Draft saved successfully at ${timeString}!`);
    }
  }

  function handleFormChange(e: React.FormEvent<HTMLFormElement>) {
    if (typeof window === "undefined") return;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    const currentForm = e.currentTarget;
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveDraftToLocalStorage(currentForm, false);
    }, 1500);
  }

  function handleManualSave() {
    const formElement = document.getElementById("visit-creation-form") as HTMLFormElement;
    if (formElement) {
      saveDraftToLocalStorage(formElement, true);
    } else {
      toast.error("Could not locate form element to save");
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const draftKey = getDraftKey(selectedPatientId);
    const saved = localStorage.getItem(draftKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.timestamp && !isDraftExpired(parsed.timestamp)) {
          const shouldAutoRestore = searchParams.get("restore") === "1";
          if (shouldAutoRestore) {
            performRestore(parsed);
          } else {
            setDraftTime(parsed.timestamp);
            setShowRestoreBanner(true);
          }
        } else if (parsed && isDraftExpired(parsed.timestamp)) {
          localStorage.removeItem(draftKey);
        }
      } catch (err) {
        console.error("Failed to parse visit draft:", err);
      }
    } else {
      setShowRestoreBanner(false);
      setDraftTime(null);
    }
  }, [selectedPatientId, searchParams]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);
  const isFollowUp = visitType === "follow_up";
  const selectedPatient = patientDetail || patients.find((patient) => String(patient.id) === selectedPatientId) || null;
  const shouldCaptureReproductiveReview = selectedPatient?.gender === "female";
  const visitSteps = isFollowUp
    ? [
        { id: "details", title: "Visit details", description: "Patient, date, and previous complaint.", icon: CalendarCheck, tone: "appointment" as const },
        { id: "symptoms", title: "Symptoms / Problems", description: "Carry forward, add, or resolve items.", icon: ClipboardList, tone: "clinical" as const },
        { id: "follow-up", title: "Follow-up evaluation", description: "Changes since remedy.", icon: HeartPulse, tone: "vitals" as const },
        { id: "decision", title: "New decision", description: "New diagnosis, remedy, and recommendations.", icon: FileText, tone: "notes" as const }
      ]
    : [
        { id: "details", title: "Visit details", description: "Patient, date, and complaint summary.", icon: CalendarCheck, tone: "appointment" as const },
        { id: "symptoms", title: "Symptoms / Problems", description: "Working problem list for this visit.", icon: ClipboardList, tone: "clinical" as const },
        { id: "digestive", title: "Digestive review", description: "GI, appetite, thirst, cravings, and aggravation.", icon: ClipboardList, tone: "clinical" as const },
        { id: "elimination", title: "Bowel and urinary review", description: "Bowel function and urination details.", icon: HeartPulse, tone: "vitals" as const },
        { id: "general", title: "General review", description: "Reproductive, sleep, energy, weather, mental.", icon: ClipboardList, tone: "clinical" as const },
        { id: "decision", title: "Clinical decision", description: "Exam, diagnosis, remedy, recommendations.", icon: FileText, tone: "notes" as const }
      ];
  const activeStep = visitSteps[Math.min(activeStepIndex, visitSteps.length - 1)];
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === visitSteps.length - 1;

  useEffect(() => {
    setActiveStepIndex(0);
  }, [visitType]);

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

  const previousVisits = useMemo(() => patientDetail?.visits || [], [patientDetail]);
  const previousVisit = previousVisits[0];
  const priorComplaint = previousComplaint(previousVisit);

  useEffect(() => {
    if (isFollowUp && priorComplaint) {
      setMainComplaint(priorComplaint);
    }
  }, [isFollowUp, priorComplaint]);

  useEffect(() => {
    const openProblems = previousVisits
      .flatMap((visit) => visit.symptom_problems || [])
      .filter((problem) => problem.status === "open");
    const uniqueProblems = Array.from(new Map(openProblems.map((problem) => [problem.id, problem])).values());

    if (isFollowUp && uniqueProblems.length > 0) {
      setSymptomProblems(
        uniqueProblems.map((problem) => ({
          key: `existing-${problem.id}`,
          id: problem.id,
          description: problem.description,
          note: problem.note || "",
          status: "open"
        }))
      );
      return;
    }

    setSymptomProblems([{ key: "new-0", description: "", note: "", status: "open" }]);
  }, [isFollowUp, selectedPatientId, previousVisits]);

  const remedyEvaluations = useMemo(
    () =>
      previousVisits
        .filter((visit) => visit.remedy || visit.follow_up_evaluation?.evaluation_notes)
        .map((visit) => ({
          id: visit.id,
          date: visit.visit_date,
          visit_type: visit.visit_type,
          remedy: visit.remedy || "--",
          reason: visit.reason_for_remedy || "",
          evaluation: visit.follow_up_evaluation?.evaluation_notes || "",
          main_complaint: visit.main_complaint || "",
          diagnosis: visit.diagnosis || ""
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

    const symptom_problem_updates = symptomProblems
      .map((problem) => ({
        id: problem.id,
        description: problem.description.trim(),
        note: problem.note.trim(),
        status: problem.status
      }))
      .filter((problem) => problem.id || problem.description);

    const complaintSummary =
      val("main_complaint") ||
      symptom_problem_updates
        .map((problem) => problem.description)
        .filter(Boolean)
        .join(", ");

    const compiledRemedy = remedies
      .filter((r) => r.name.trim())
      .map((r) => `• ${r.name.trim()}${r.instructions.trim() ? `\n  Instructions: ${r.instructions.trim()}` : ""}`)
      .join("\n\n");

    const compiledReason = remedies
      .filter((r) => r.name.trim() && r.reason.trim())
      .map((r) => `• ${r.name.trim()}:\n  ${r.reason.trim()}`)
      .join("\n\n");

    const practitionerEvaluationNote = val("practitioner_evaluation_note");

    const compiledEvaluationNotes = isFollowUp
      ? [
          "--- SYMPTOM OUTCOMES ---",
          ...symptom_problem_updates.map((p) => `${p.status === "resolved" ? "✓" : "⚡"} ${p.description}: ${p.status}\n  ${p.note}`),
          "",
          "--- VITALS & ENERGY ---",
          `Energy: ${val("energy_since_remedy_score")}/10 - ${val("energy_since_remedy")}`,
          `Appetite: ${val("appetite_since_remedy_score")}/10 - ${val("appetite_since_remedy")}`,
          `Sleep: ${val("sleep_since_remedy_score")}/10 - ${val("sleep_since_remedy")}`,
          `Mental State: ${val("mental_since_remedy_score")}/10 - ${val("mental_since_remedy")}`,
          "",
          "--- CLINICIAN OVERVIEW ---",
          practitionerEvaluationNote || "No additional overview provided."
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const body = {
      patient: Number(val("patient")),
      visit_type: val("visit_type") || "new_consultation",
      visit_date: val("visit_date"),
      visit_time: val("visit_time") || null,
      main_complaint: complaintSummary,
      initial_complaints: "",
      physical_examination: val("physical_examination"),
      diagnosis: val("diagnosis"),
      remedy: compiledRemedy,
      reason_for_remedy: compiledReason,
      dietary_recommendation: val("dietary_recommendation"),
      lifestyle_recommendation: val("lifestyle_recommendation"),
      digestive_review: {
        gastrointestinal: val("gastrointestinal"),
        appetite_status: val("appetite_status"),
        appetite_note: val("appetite_note"),
        thirst_status: val("thirst_status"),
        thirst_note: val("thirst_note"),
        cravings_present: val("cravings_present"),
        cravings_note: val("cravings_note"),
        aggravation: val("aggravation"),
        bowel_function: val("bowel_function"),
        urination_frequency_per_day: val("urination_frequency_per_day"),
        urination_urgency: val("urination_urgency"),
        urination_pain: val("urination_pain"),
        urination_pain_note: val("urination_pain_note")
      },
      general_review: {
        energy_status: val("energy_status"),
        weather_preference: val("weather_preference"),
        weather_note: val("weather_note")
      },
      reproductive_review: shouldCaptureReproductiveReview
        ? {
            menstruation_duration_days: val("menstruation_duration_days"),
            menstruation_regular: val("menstruation_regular"),
            menstruation_regular_note: val("menstruation_regular_note"),
            menstruation_volume: val("menstruation_volume"),
            menstruation_volume_note: val("menstruation_volume_note"),
            menstruation_color: val("menstruation_color"),
            menstruation_color_other: val("menstruation_color_other"),
            menstruation_consistency: val("menstruation_consistency"),
            menstruation_consistency_note: val("menstruation_consistency_note"),
            menstruation_pain_scale: val("menstruation_pain_scale"),
            menstruation_pain_note: val("menstruation_pain_note"),
            concomitants: val("concomitants"),
            menarche_age: val("menarche_age"),
            pms_symptoms: val("pms_symptoms"),
            pregnancies: val("pregnancies"),
            menopause: val("menopause"),
            genitals_eruption: val("genitals_eruption"),
            genitals_eruption_note: val("genitals_eruption_note"),
            genitals_discharge: val("genitals_discharge"),
            genitals_discharge_note: val("genitals_discharge_note"),
            genitals_infections: val("genitals_infections"),
            sexual_activity: val("sexual_activity")
          }
        : {},
      sleep_mental_review: {
        sleep_pattern: val("sleep_pattern"),
        sleep_pattern_note: val("sleep_pattern_note"),
        sleep_quality_hours: val("sleep_quality_hours"),
        sleep_position: val("sleep_position"),
        dreams: val("dreams"),
        mental_state: val("mental_state")
      },
      follow_up_review: {
        evaluation_previous_complaint: "",
        energy_since_remedy_score: val("energy_since_remedy_score"),
        energy_since_remedy: val("energy_since_remedy"),
        appetite_since_remedy_score: val("appetite_since_remedy_score"),
        appetite_since_remedy: val("appetite_since_remedy"),
        sleep_since_remedy_score: val("sleep_since_remedy_score"),
        sleep_since_remedy: val("sleep_since_remedy"),
        mental_since_remedy_score: val("mental_since_remedy_score"),
        mental_since_remedy: val("mental_since_remedy")
      },
      symptom_problem_updates,
      ...(isFollowUp
        ? {
            follow_up_evaluation: {
              previous_consult_symptoms: "",
              dietary_changes: val("dietary_changes"),
              lifestyle_changes: val("lifestyle_changes"),
              exercise_notes: "",
              energy_notes: val("energy_since_remedy"),
              evaluation_notes: compiledEvaluationNotes
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
      if (typeof window !== "undefined") {
        localStorage.removeItem(getDraftKey(selectedPatientId));
      }
      toast.success("Visit saved");
      const targetId = selectedPatient?.public_id || selectedPatientId;
      router.push(`/patients/${targetId}`);
    } else {
      const message = extractSubmitError(data);
      setError(message);
      showActionError({
        title: "Visit could not be saved",
        message
      });
      setLoading(false);
    }
  }

  function updateSymptomProblem(key: string, patch: Partial<SymptomProblemRow>) {
    setSymptomProblems((current) => current.map((problem) => (problem.key === key ? { ...problem, ...patch } : problem)));
  }

  function addSymptomProblem() {
    setSymptomProblems((current) => [
      ...current,
      { key: `new-${Date.now()}-${current.length}`, description: "", note: "", status: "open" }
    ]);
  }

  function removeSymptomProblem(key: string) {
    setSymptomProblems((current) => {
      const next = current.filter((problem) => problem.key !== key);
      return next.length > 0 ? next : [{ key: "new-0", description: "", note: "", status: "open" }];
    });
  }

  function updateRemedy(key: string, patch: Partial<RemedyRow>) {
    setRemedies((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRemedy() {
    setRemedies((current) => [
      ...current,
      { key: `new-rem-${Date.now()}-${current.length}`, name: "", instructions: "", reason: "" }
    ]);
  }

  function removeRemedy(key: string) {
    setRemedies((current) => {
      const next = current.filter((r) => r.key !== key);
      return next.length > 0 ? next : [{ key: "new-rem-0", name: "", instructions: "", reason: "" }];
    });
  }

  return (
    <form id="visit-creation-form" key={formKey} onSubmit={handleSubmit} onChange={handleFormChange} className="grid gap-6">
      <FormStepWheel steps={visitSteps} activeIndex={activeStepIndex} setActiveIndex={setActiveStepIndex} />

      {showRestoreBanner && draftTime && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <ClipboardList className="text-amber-600 mt-0.5 shrink-0" size={20} />
            <div>
              <div className="font-bold text-amber-950">Draft visit found!</div>
              <p className="text-sm mt-0.5 text-amber-800">
                We found an unsaved draft of this visit/case from {new Date(draftTime).toLocaleString()}. Would you like to restore it and resume where you left off?
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 sm:self-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                const draftKey = getDraftKey(selectedPatientId);
                const saved = localStorage.getItem(draftKey);
                if (saved) performRestore(JSON.parse(saved));
              }}
              className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-950 font-bold"
            >
              Restore Draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDiscardDraft}
              className="text-amber-800 hover:bg-amber-100 hover:text-amber-950"
            >
              Discard
            </Button>
          </div>
        </div>
      )}
      <div className="grid gap-6">
        <section className="hh-panel p-4">
          <FormSectionHeader
            icon={activeStep.icon}
            title={activeStep.title}
            description={activeStep.description}
            eyebrow={`Step ${activeStepIndex + 1} of ${visitSteps.length}`}
            tone={activeStep.tone}
          />
        </section>
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <section className={activeStep.id === "details" ? "hh-panel p-5" : "hidden"}>
        <FormSectionHeader className="mb-4" icon={CalendarCheck} title="Visit details" description="Choose the patient, visit type, date, and complaint context." tone="appointment" />
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
          <input name="visit_date" type="hidden" defaultValue={initialValues["visit_date"] || today} />
          <input name="visit_time" type="hidden" defaultValue={initialValues["visit_time"] || nowTime} />
          <label className="md:col-span-2">
            <span className="hh-label">{isFollowUp ? "Previous complaint / case" : "Main complaint"}</span>
            <input className="hh-input" name="main_complaint" value={mainComplaint} onChange={(event) => setMainComplaint(event.currentTarget.value)} readOnly={isFollowUp && Boolean(priorComplaint)} placeholder={isFollowUp ? "Pulled from the previous visit when available" : "Optional summary; symptom/problem items below become the working case list"} />
          </label>
        </div>
      </section>

      <section className={activeStep.id === "symptoms" ? "hh-panel p-5" : "hidden"}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase text-[#66736d]">
              <ClipboardList size={17} className="text-[var(--hh-purple)]" />
              Symptoms / Problems
            </div>
            <p className="mt-1 text-sm leading-6 text-[#53605a]">
              Add each symptom or problem as its own item. Follow-up visits carry open items forward so they can be explained, kept open, or marked resolved.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addSymptomProblem}>
            <Plus size={16} />
            Add more
          </Button>
        </div>
        <div className="grid gap-3">
          {symptomProblems.map((problem, index) => (
            <div key={problem.key} className="rounded-lg border border-[var(--hh-border-strong)] bg-white p-3 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.4fr)_auto_auto] lg:items-start">
                <label>
                  <span className="hh-label">Symptom / problem {index + 1}</span>
                  <input
                    className="hh-input"
                    value={problem.description}
                    onChange={(event) => updateSymptomProblem(problem.key, { description: event.currentTarget.value })}
                    placeholder="e.g. Headache"
                  />
                </label>
                <label>
                  <span className="hh-label">Explanation / note</span>
                  <input
                    className="hh-input"
                    value={problem.note}
                    onChange={(event) => updateSymptomProblem(problem.key, { note: event.currentTarget.value })}
                    placeholder="Explain severity, timing, change, or context"
                  />
                </label>
                <div>
                  <span className="hh-label">Status</span>
                  <div className="flex rounded-lg border border-[var(--hh-border-strong)] bg-[#f7faf8] p-1">
                    <button
                      type="button"
                      className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold ${problem.status === "open" ? "bg-white text-[var(--hh-purple)] shadow-sm" : "text-[#53605a]"}`}
                      onClick={() => updateSymptomProblem(problem.key, { status: "open" })}
                    >
                      <X size={16} />
                      Not resolved
                    </button>
                    <button
                      type="button"
                      className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-bold ${problem.status === "resolved" ? "bg-emerald-600 text-white shadow-sm" : "text-[#53605a]"}`}
                      onClick={() => updateSymptomProblem(problem.key, { status: "resolved" })}
                    >
                      <Check size={16} />
                      Resolved
                    </button>
                  </div>
                </div>
                <div className="flex lg:pt-6">
                  <Button type="button" variant="ghost" onClick={() => removeSymptomProblem(problem.key)} aria-label="Remove symptom problem">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {!isFollowUp && (
        <section className={activeStep.id === "digestive" ? "hh-panel p-5" : "hidden"}>
          <FormSectionHeader className="mb-4" icon={ClipboardList} title="Digestive review" description="GI, appetite, thirst, cravings, and aggravation." tone="clinical" />
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="hh-label">Gastrointestinal</span>
              <textarea className="hh-input min-h-24" name="gastrointestinal" placeholder="Indigestion, heartburn, cramps, flatulence, aversions" defaultValue={initialValues["gastrointestinal"] || ""} />
            </label>
            <SelectField name="appetite_status" label="Appetite" options={["", "Increased", "Decreased", "Normal"]} defaultValue={initialValues["appetite_status"] || ""} />
            <label>
              <span className="hh-label">Appetite note</span>
              <input className="hh-input" name="appetite_note" defaultValue={initialValues["appetite_note"] || ""} />
            </label>
            <SelectField name="thirst_status" label="Thirst" options={["", "Increased", "Decreased", "Normal"]} defaultValue={initialValues["thirst_status"] || ""} />
            <label>
              <span className="hh-label">Thirst note</span>
              <input className="hh-input" name="thirst_note" defaultValue={initialValues["thirst_note"] || ""} />
            </label>
            <SelectField name="cravings_present" label="Cravings" options={["", "No", "Yes"]} defaultValue={initialValues["cravings_present"] || ""} />
            <label>
              <span className="hh-label">Cravings note</span>
              <input className="hh-input" name="cravings_note" defaultValue={initialValues["cravings_note"] || ""} />
            </label>
            <label>
              <span className="hh-label">Aggravation</span>
              <textarea className="hh-input min-h-20" name="aggravation" defaultValue={initialValues["aggravation"] || ""} />
            </label>
          </div>
        </section>
      )}

      {!isFollowUp && (
        <section className={activeStep.id === "elimination" ? "hh-panel p-5" : "hidden"}>
          <FormSectionHeader className="mb-4" icon={HeartPulse} title="Bowel and urinary review" description="Bowel function, urination frequency, urgency, and pain." tone="vitals" />
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="hh-label">Bowel function</span>
              <textarea className="hh-input min-h-24" name="bowel_function" placeholder="Constipation, diarrhea, hemorrhoids" defaultValue={initialValues["bowel_function"] || ""} />
            </label>
            <label>
              <span className="hh-label">Urination frequency per day</span>
              <input className="hh-input" name="urination_frequency_per_day" type="number" min="0" defaultValue={initialValues["urination_frequency_per_day"] || ""} />
            </label>
            <label>
              <span className="hh-label">Urination urgency</span>
              <input className="hh-input" name="urination_urgency" defaultValue={initialValues["urination_urgency"] || ""} />
            </label>
            <SelectField name="urination_pain" label="Urination pain" options={["", "No", "Yes"]} defaultValue={initialValues["urination_pain"] || ""} />
            <label>
              <span className="hh-label">Urination pain note</span>
              <input className="hh-input" name="urination_pain_note" defaultValue={initialValues["urination_pain_note"] || ""} />
            </label>
          </div>
        </section>
      )}

      {!isFollowUp && (
        <section className={activeStep.id === "general" ? "hh-panel p-5" : "hidden"}>
          <FormSectionHeader className="mb-4" icon={ClipboardList} title={shouldCaptureReproductiveReview ? "Reproductive, sleep, general, and mental review" : "Sleep, general, and mental review"} description="General modalities, sleep, energy, weather preference, and mental review." tone="clinical" />
          <div className="grid gap-4 md:grid-cols-2">
            {shouldCaptureReproductiveReview && (
              <>
                <label>
                  <span className="hh-label">Menstruation duration of cycle (days)</span>
                  <input className="hh-input" name="menstruation_duration_days" type="number" min="0" defaultValue={initialValues["menstruation_duration_days"] || ""} />
                </label>
                <SelectField name="menstruation_regular" label="Regular cycle" options={["", "Yes", "No"]} defaultValue={initialValues["menstruation_regular"] || ""} />
                <label>
                  <span className="hh-label">Irregular cycle note</span>
                  <input className="hh-input" name="menstruation_regular_note" defaultValue={initialValues["menstruation_regular_note"] || ""} />
                </label>
                <SelectField name="menstruation_volume" label="Volume" options={["", "Light", "Heavy", "Normal"]} defaultValue={initialValues["menstruation_volume"] || ""} />
                <label>
                  <span className="hh-label">Volume note</span>
                  <input className="hh-input" name="menstruation_volume_note" defaultValue={initialValues["menstruation_volume_note"] || ""} />
                </label>
                <SelectField name="menstruation_color" label="Color" options={["", "Bright red", "Red-red", "Dark red", "Other"]} defaultValue={initialValues["menstruation_color"] || ""} />
                <label>
                  <span className="hh-label">Color other / note</span>
                  <input className="hh-input" name="menstruation_color_other" defaultValue={initialValues["menstruation_color_other"] || ""} />
                </label>
                <SelectField name="menstruation_consistency" label="Consistency concern" options={["", "No", "Yes"]} defaultValue={initialValues["menstruation_consistency"] || ""} />
                <label>
                  <span className="hh-label">Consistency note</span>
                  <input className="hh-input" name="menstruation_consistency_note" defaultValue={initialValues["menstruation_consistency_note"] || ""} />
                </label>
                <ScaleField name="menstruation_pain_scale" label="Pain scale" minLabel="No pain" maxLabel="Worst pain" defaultValue={initialValues["menstruation_pain_scale"] ? Number(initialValues["menstruation_pain_scale"]) : 5} />
                <label>
                  <span className="hh-label">Pain note</span>
                  <input className="hh-input" name="menstruation_pain_note" defaultValue={initialValues["menstruation_pain_note"] || ""} />
                </label>
                <label>
                  <span className="hh-label">Concomitants</span>
                  <input className="hh-input" name="concomitants" defaultValue={initialValues["concomitants"] || ""} />
                </label>
                <label>
                  <span className="hh-label">Menarche age</span>
                  <input className="hh-input" name="menarche_age" type="number" min="0" defaultValue={initialValues["menarche_age"] || ""} />
                </label>
                <label>
                  <span className="hh-label">PMS symptoms</span>
                  <textarea className="hh-input min-h-20" name="pms_symptoms" defaultValue={initialValues["pms_symptoms"] || ""} />
                </label>
                <label>
                  <span className="hh-label">Pregnancies</span>
                  <input className="hh-input" name="pregnancies" type="number" min="0" defaultValue={initialValues["pregnancies"] || ""} />
                </label>
                <label>
                  <span className="hh-label">Menopause</span>
                  <textarea className="hh-input min-h-20" name="menopause" defaultValue={initialValues["menopause"] || ""} />
                </label>
                <SelectField name="genitals_eruption" label="Genital eruption" options={["", "No", "Yes"]} defaultValue={initialValues["genitals_eruption"] || ""} />
                <label>
                  <span className="hh-label">Eruption note</span>
                  <input className="hh-input" name="genitals_eruption_note" defaultValue={initialValues["genitals_eruption_note"] || ""} />
                </label>
                <SelectField name="genitals_discharge" label="Genital discharge" options={["", "No", "Yes"]} defaultValue={initialValues["genitals_discharge"] || ""} />
                <label>
                  <span className="hh-label">Discharge note</span>
                  <input className="hh-input" name="genitals_discharge_note" defaultValue={initialValues["genitals_discharge_note"] || ""} />
                </label>
                <SelectField name="genitals_infections" label="Genital infections" options={["", "No", "Yes"]} defaultValue={initialValues["genitals_infections"] || ""} />
                <label>
                  <span className="hh-label">Sexual activity</span>
                  <textarea className="hh-input min-h-20" name="sexual_activity" placeholder="Libido, STI history, relevant notes" defaultValue={initialValues["sexual_activity"] || ""} />
                </label>
              </>
            )}
            <SelectField name="sleep_pattern" label="Sleep pattern" options={["", "Regular", "Irregular"]} defaultValue={initialValues["sleep_pattern"] || ""} />
            <label>
              <span className="hh-label">Sleep pattern note</span>
              <input className="hh-input" name="sleep_pattern_note" defaultValue={initialValues["sleep_pattern_note"] || ""} />
            </label>
            <label>
              <span className="hh-label">Sleep quality (hours per day)</span>
              <input className="hh-input" name="sleep_quality_hours" type="number" min="0" step="0.5" defaultValue={initialValues["sleep_quality_hours"] || ""} />
            </label>
            <SelectField name="sleep_position" label="Sleep position" options={["", "Back", "Stomach", "Left", "Right"]} defaultValue={initialValues["sleep_position"] || ""} />
            <label>
              <span className="hh-label">Dreams</span>
              <textarea className="hh-input min-h-20" name="dreams" defaultValue={initialValues["dreams"] || ""} />
            </label>
            <SelectField name="energy_status" label="Energy" options={["", "Increased", "Decreased", "Normal"]} defaultValue={initialValues["energy_status"] || ""} />
            <SelectField name="weather_preference" label="Weather preference" options={["", "Cold", "Hot"]} defaultValue={initialValues["weather_preference"] || ""} />
            <label>
              <span className="hh-label">Weather note</span>
              <input className="hh-input" name="weather_note" defaultValue={initialValues["weather_note"] || ""} />
            </label>
            <label className="md:col-span-2">
              <span className="hh-label">Mental / personality review</span>
              <textarea className="hh-input min-h-28" name="mental_state" placeholder="Self-description, fears, personality, anxiety, worries, anger, relationships" defaultValue={initialValues["mental_state"] || ""} />
            </label>
          </div>
        </section>
      )}

      {isFollowUp && (
        <section className={activeStep.id === "follow-up" ? "hh-panel p-5" : "hidden"}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase text-[#66736d]">
                <HeartPulse size={17} className="text-[#8f1f32]" />
                Follow-up context
              </div>
              <p className="mt-2 text-sm leading-6 text-[#53605a]">
                The previous complaint is pulled into this visit. Previous diagnosis, remedy, and recommendations are hidden until opened for review.
              </p>
            </div>
            <PreviousClinicalContext previousVisit={previousVisit} />
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--hh-border)]">
            <table className="hh-table w-full text-left text-sm">
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
                    <td className="px-3 py-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button type="button" variant="secondary" size="sm" className="text-xs gap-1.5">
                            <Eye size={14} />
                            View Remedy
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[min(94vw,600px)]">
                          <div className="border-b border-[var(--hh-border)] px-5 py-4 pr-14">
                            <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">Remedy Details</DialogTitle>
                            <DialogDescription className="mt-1 text-sm text-[#66736d]">
                              Visit on {formatDate(row.date)}
                            </DialogDescription>
                          </div>
                          <div className="p-5 grid gap-4 max-h-[70vh] overflow-y-auto">
                            <div>
                              <div className="text-xs font-bold uppercase text-[#66736d] mb-1.5">Remedy & Instructions</div>
                              <div className="whitespace-pre-wrap text-sm leading-6 text-[#1f2933] rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">{row.remedy}</div>
                            </div>
                            {row.reason && (
                              <div>
                                <div className="text-xs font-bold uppercase text-[#66736d] mb-1.5">Reason for Remedy</div>
                                <div className="whitespace-pre-wrap text-sm leading-6 text-[#1f2933] rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">{row.reason}</div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                    <td className="px-3 py-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button type="button" variant="secondary" size="sm" className="text-xs gap-1.5">
                            <Eye size={14} />
                            View Progress
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[min(94vw,600px)]">
                          <div className="border-b border-[var(--hh-border)] px-5 py-4 pr-14">
                            <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">Progress Summary</DialogTitle>
                            <DialogDescription className="mt-1 text-sm text-[#66736d]">
                              Visit on {formatDate(row.date)}
                            </DialogDescription>
                          </div>
                          <div className="p-5 max-h-[70vh] overflow-y-auto">
                            {row.evaluation ? (
                              <div className="whitespace-pre-wrap text-sm leading-6 text-[#1f2933] rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
                                {row.evaluation}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-emerald-100 bg-[#f4faf6] p-4 text-[#1f2933]">
                                <div className="text-xs font-bold uppercase text-emerald-800 mb-2">Initial Consultation (First Visit)</div>
                                <p className="text-sm leading-6 text-emerald-950 font-medium">
                                  No follow-up evaluation is recorded yet for this date because this was the patient's first consultation.
                                </p>
                                {(row.main_complaint || row.diagnosis) && (
                                  <div className="mt-4 grid gap-3 border-t border-emerald-200/60 pt-3 text-xs leading-5">
                                    {row.main_complaint && (
                                      <div>
                                        <span className="font-bold text-emerald-900 uppercase block">Main Complaint:</span>
                                        <span className="text-emerald-950 font-normal">{row.main_complaint}</span>
                                      </div>
                                    )}
                                    {row.diagnosis && (
                                      <div>
                                        <span className="font-bold text-emerald-900 uppercase block">Diagnosis:</span>
                                        <span className="text-emerald-950 font-normal">{row.diagnosis}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
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

      <section className={activeStep.id === "follow-up" || (!isFollowUp && activeStep.id === "decision") ? "hh-panel p-5" : "hidden"}>
        <FormSectionHeader className="mb-4" icon={FileText} title={isFollowUp ? "Evaluation (follow up)" : "Clinical notes"} description={isFollowUp ? "Record response to previous remedy and changes since the last consult." : "Capture examination, diagnosis, remedy, and recommendations."} tone="notes" />
        {isFollowUp ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ScaleWithNote name="energy_since_remedy" scoreName="energy_since_remedy_score" label="Energy since remedy" minLabel="Worse" maxLabel="Much better" placeholder="Any changes since remedy: how, when, and how much" scoreDefaultValue={initialValues["energy_since_remedy_score"] ? Number(initialValues["energy_since_remedy_score"]) : 5} noteDefaultValue={initialValues["energy_since_remedy"] || ""} />
            <ScaleWithNote name="appetite_since_remedy" scoreName="appetite_since_remedy_score" label="Appetite since remedy" minLabel="Worse" maxLabel="Much better" scoreDefaultValue={initialValues["appetite_since_remedy_score"] ? Number(initialValues["appetite_since_remedy_score"]) : 5} noteDefaultValue={initialValues["appetite_since_remedy"] || ""} />
            <ScaleWithNote name="sleep_since_remedy" scoreName="sleep_since_remedy_score" label="Sleep since remedy" minLabel="Worse" maxLabel="Much better" scoreDefaultValue={initialValues["sleep_since_remedy_score"] ? Number(initialValues["sleep_since_remedy_score"]) : 5} noteDefaultValue={initialValues["sleep_since_remedy"] || ""} />
            <ScaleWithNote name="mental_since_remedy" scoreName="mental_since_remedy_score" label="Mental state since remedy" minLabel="Worse" maxLabel="Much better" placeholder="How have they been feeling after the remedy?" scoreDefaultValue={initialValues["mental_since_remedy_score"] ? Number(initialValues["mental_since_remedy_score"]) : 5} noteDefaultValue={initialValues["mental_since_remedy"] || ""} />
            <label className="md:col-span-2">
              <span className="hh-label">Practitioner evaluation note</span>
              <textarea className="hh-input min-h-28" name="practitioner_evaluation_note" placeholder="Your overall clinical impression of the patient's response to previous treatment and current status" defaultValue={initialValues["practitioner_evaluation_note"] || ""} />
            </label>
            <label>
              <span className="hh-label">Dietary changes</span>
              <textarea className="hh-input min-h-20" name="dietary_changes" defaultValue={initialValues["dietary_changes"] || ""} />
            </label>
            <label>
              <span className="hh-label">Lifestyle changes</span>
              <textarea className="hh-input min-h-20" name="lifestyle_changes" defaultValue={initialValues["lifestyle_changes"] || ""} />
            </label>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="hh-label">Physical examination</span>
              <textarea className="hh-input min-h-28" name="physical_examination" defaultValue={initialValues["physical_examination"] || ""} />
            </label>
            <label>
              <span className="hh-label">Diagnosis</span>
              <textarea className="hh-input min-h-28" name="diagnosis" defaultValue={initialValues["diagnosis"] || ""} />
            </label>
            <div className="md:col-span-2">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold uppercase text-[#66736d]">
                    <ClipboardList size={17} className="text-[var(--hh-purple)]" />
                    Remedies
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#53605a]">
                    Add each remedy as its own item with instructions and reason.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={addRemedy}>
                  <Plus size={16} />
                  Add remedy
                </Button>
              </div>
              <div className="grid gap-3">
                {remedies.map((remedy, index) => (
                  <div key={remedy.key} className="rounded-lg border border-[var(--hh-border-strong)] bg-white p-3 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <label>
                        <span className="hh-label">Remedy {index + 1}</span>
                        <input
                          className="hh-input"
                          value={remedy.name}
                          onChange={(e) => updateRemedy(remedy.key, { name: e.currentTarget.value })}
                          placeholder="e.g. Pulsatilla 30C"
                        />
                      </label>
                      <label>
                        <span className="hh-label">Reason</span>
                        <input
                          className="hh-input"
                          value={remedy.reason}
                          onChange={(e) => updateRemedy(remedy.key, { reason: e.currentTarget.value })}
                          placeholder="Why this remedy was chosen"
                        />
                      </label>
                      <div className="flex md:pt-6">
                        <Button type="button" variant="ghost" onClick={() => removeRemedy(remedy.key)} aria-label="Remove remedy">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <label className="mt-2 block">
                      <span className="hh-label">Instructions</span>
                      <input
                        className="hh-input"
                        value={remedy.instructions}
                        onChange={(e) => updateRemedy(remedy.key, { instructions: e.currentTarget.value })}
                        placeholder="e.g. 3 pellets dry on tongue, twice daily"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <label>
              <span className="hh-label">Dietary recommendation</span>
              <textarea className="hh-input min-h-28" name="dietary_recommendation" defaultValue={initialValues["dietary_recommendation"] || ""} />
            </label>
            <label>
              <span className="hh-label">Lifestyle recommendation</span>
              <textarea className="hh-input min-h-28" name="lifestyle_recommendation" defaultValue={initialValues["lifestyle_recommendation"] || ""} />
            </label>
          </div>
        )}
      </section>

      {isFollowUp && (
        <section className={activeStep.id === "decision" ? "hh-panel p-5" : "hidden"}>
          <FormSectionHeader className="mb-4" icon={FileText} title="New clinical decision" description="Record the updated diagnosis, remedy, and recommendations." tone="notes" />
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="hh-label">Physical examination</span>
              <textarea className="hh-input min-h-28" name="physical_examination" defaultValue={initialValues["physical_examination"] || ""} />
            </label>
            <label>
              <span className="hh-label">New diagnosis</span>
              <textarea className="hh-input min-h-28" name="diagnosis" defaultValue={initialValues["diagnosis"] || ""} />
            </label>
            <div className="md:col-span-2">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold uppercase text-[#66736d]">
                    <ClipboardList size={17} className="text-[var(--hh-purple)]" />
                    Remedies
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#53605a]">
                    Add each remedy as its own item with instructions and reason.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={addRemedy}>
                  <Plus size={16} />
                  Add remedy
                </Button>
              </div>
              <div className="grid gap-3">
                {remedies.map((remedy, index) => (
                  <div key={remedy.key} className="rounded-lg border border-[var(--hh-border-strong)] bg-white p-3 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <label>
                        <span className="hh-label">Remedy {index + 1}</span>
                        <input
                          className="hh-input"
                          value={remedy.name}
                          onChange={(e) => updateRemedy(remedy.key, { name: e.currentTarget.value })}
                          placeholder="e.g. Pulsatilla 30C"
                        />
                      </label>
                      <label>
                        <span className="hh-label">Reason</span>
                        <input
                          className="hh-input"
                          value={remedy.reason}
                          onChange={(e) => updateRemedy(remedy.key, { reason: e.currentTarget.value })}
                          placeholder="Why this remedy was chosen"
                        />
                      </label>
                      <div className="flex md:pt-6">
                        <Button type="button" variant="ghost" onClick={() => removeRemedy(remedy.key)} aria-label="Remove remedy">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    <label className="mt-2 block">
                      <span className="hh-label">Instructions</span>
                      <input
                        className="hh-input"
                        value={remedy.instructions}
                        onChange={(e) => updateRemedy(remedy.key, { instructions: e.currentTarget.value })}
                        placeholder="e.g. 3 pellets dry on tongue, twice daily"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <label>
              <span className="hh-label">Dietary recommendation</span>
              <textarea className="hh-input min-h-28" name="dietary_recommendation" defaultValue={initialValues["dietary_recommendation"] || ""} />
            </label>
            <label>
              <span className="hh-label">Lifestyle recommendation</span>
              <textarea className="hh-input min-h-28" name="lifestyle_recommendation" defaultValue={initialValues["lifestyle_recommendation"] || ""} />
            </label>
          </div>
        </section>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between sm:items-center">
        <Button type="button" variant="secondary" onClick={() => setActiveStepIndex((value) => Math.max(0, value - 1))} disabled={isFirstStep}>
          <ChevronLeft size={17} />
          Back
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {lastSavedText && (
            <span className="text-xs text-[#53605a] italic text-right font-medium mr-1 animate-pulse">
              {lastSavedText}
            </span>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={handleManualSave}
            className="border-[var(--hh-purple)] text-[var(--hh-purple)] hover:bg-[var(--hh-purple-light)]"
          >
            <Save size={17} className="mr-2" />
            Save Draft
          </Button>
          {isLastStep ? (
            <LoadingButton type="submit" loading={loading} loadingText="Saving visit...">
              {!loading && <Save size={17} />}
              Save visit
            </LoadingButton>
          ) : (
            <Button type="button" onClick={() => setActiveStepIndex((value) => Math.min(visitSteps.length - 1, value + 1))}>
              Continue
              <ChevronRight size={17} />
            </Button>
          )}
        </div>
      </div>
      </div>
    </form>
  );
}

function SelectField({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) {
  return (
    <label>
      <span className="hh-label">{label}</span>
      <select className="hh-input" name={name} defaultValue={defaultValue}>
        {options.map((option) => (
          <option key={option || "blank"} value={option.toLowerCase().replaceAll(" ", "_")}>
            {option || "Select"}
          </option>
        ))}
      </select>
    </label>
  );
}

function ScaleField({
  name,
  label,
  minLabel = "Low",
  maxLabel = "High",
  defaultValue = 5
}: {
  name: string;
  label: string;
  minLabel?: string;
  maxLabel?: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <div className="grid gap-2 rounded-lg border border-[var(--hh-border)] bg-[#fbfdfc] p-3">
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center justify-between gap-3">
        <span className="hh-label">{label}</span>
        <span className="rounded-full border border-[var(--hh-border)] bg-white px-3 py-1 text-sm font-bold text-[var(--hh-purple)]">
          {value}/10
        </span>
      </div>
      <Slider min={0} max={10} step={1} value={[value]} onValueChange={(next) => setValue(next[0] ?? 0)} />
      <div className="flex justify-between text-xs font-semibold text-[#66736d]">
        <span>0 - {minLabel}</span>
        <span>10 - {maxLabel}</span>
      </div>
    </div>
  );
}

function ScaleWithNote({
  name,
  scoreName,
  label,
  minLabel,
  maxLabel,
  placeholder,
  scoreDefaultValue = 5,
  noteDefaultValue = ""
}: {
  name: string;
  scoreName: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  placeholder?: string;
  scoreDefaultValue?: number;
  noteDefaultValue?: string;
}) {
  return (
    <div className="grid gap-3">
      <ScaleField name={scoreName} label={`${label} score`} minLabel={minLabel} maxLabel={maxLabel} defaultValue={scoreDefaultValue} />
      <label>
        <span className="hh-label">{label} notes</span>
        <textarea className="hh-input min-h-20" name={name} placeholder={placeholder} defaultValue={noteDefaultValue} />
      </label>
    </div>
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
