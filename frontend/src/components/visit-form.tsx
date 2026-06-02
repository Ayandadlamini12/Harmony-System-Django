"use client";

import { CalendarCheck, Check, ChevronLeft, ChevronRight, ClipboardList, Eye, FileText, HeartPulse, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormStepWheel } from "@/components/form-step-wheel";
import { FormSectionHeader } from "@/components/form-section-header";
import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import type { Patient, Visit } from "@/types/clinic";

type SymptomProblemRow = {
  key: string;
  id?: number;
  description: string;
  note: string;
  status: "open" | "resolved";
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
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const today = new Date().toISOString().slice(0, 10);
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

    const body = {
      patient: Number(val("patient")),
      visit_type: val("visit_type") || "new_consultation",
      visit_date: val("visit_date"),
      visit_time: val("visit_time") || null,
      main_complaint: complaintSummary,
      initial_complaints: isFollowUp ? "" : val("initial_complaints"),
      physical_examination: val("physical_examination"),
      diagnosis: val("diagnosis"),
      remedy: val("remedy"),
      reason_for_remedy: val("reason_for_remedy"),
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
        evaluation_previous_complaint: val("evaluation_previous_complaint"),
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
              previous_consult_symptoms: val("previous_consult_symptoms"),
              dietary_changes: val("dietary_changes"),
              lifestyle_changes: val("lifestyle_changes"),
              exercise_notes: "",
              energy_notes: val("energy_since_remedy"),
              evaluation_notes: val("evaluation_previous_complaint")
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
      const message = extractSubmitError(data);
      setError(message);
      toast.error(message);
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

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <FormStepWheel steps={visitSteps} activeIndex={activeStepIndex} setActiveIndex={setActiveStepIndex} />
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
            <label><span className="hh-label">Gastrointestinal</span><textarea className="hh-input min-h-24" name="gastrointestinal" placeholder="Indigestion, heartburn, cramps, flatulence, aversions" /></label>
            <SelectField name="appetite_status" label="Appetite" options={["", "Increased", "Decreased", "Normal"]} />
            <label><span className="hh-label">Appetite note</span><input className="hh-input" name="appetite_note" /></label>
            <SelectField name="thirst_status" label="Thirst" options={["", "Increased", "Decreased", "Normal"]} />
            <label><span className="hh-label">Thirst note</span><input className="hh-input" name="thirst_note" /></label>
            <SelectField name="cravings_present" label="Cravings" options={["", "No", "Yes"]} />
            <label><span className="hh-label">Cravings note</span><input className="hh-input" name="cravings_note" /></label>
            <label><span className="hh-label">Aggravation</span><textarea className="hh-input min-h-20" name="aggravation" /></label>
          </div>
        </section>
      )}

      {!isFollowUp && (
        <section className={activeStep.id === "elimination" ? "hh-panel p-5" : "hidden"}>
          <FormSectionHeader className="mb-4" icon={HeartPulse} title="Bowel and urinary review" description="Bowel function, urination frequency, urgency, and pain." tone="vitals" />
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="hh-label">Bowel function</span><textarea className="hh-input min-h-24" name="bowel_function" placeholder="Constipation, diarrhea, hemorrhoids" /></label>
            <label><span className="hh-label">Urination frequency per day</span><input className="hh-input" name="urination_frequency_per_day" type="number" min="0" /></label>
            <label><span className="hh-label">Urination urgency</span><input className="hh-input" name="urination_urgency" /></label>
            <SelectField name="urination_pain" label="Urination pain" options={["", "No", "Yes"]} />
            <label><span className="hh-label">Urination pain note</span><input className="hh-input" name="urination_pain_note" /></label>
          </div>
        </section>
      )}

      {!isFollowUp && (
        <section className={activeStep.id === "general" ? "hh-panel p-5" : "hidden"}>
          <FormSectionHeader className="mb-4" icon={ClipboardList} title={shouldCaptureReproductiveReview ? "Reproductive, sleep, general, and mental review" : "Sleep, general, and mental review"} description="General modalities, sleep, energy, weather preference, and mental review." tone="clinical" />
          <div className="grid gap-4 md:grid-cols-2">
            {shouldCaptureReproductiveReview && (
              <>
                <label><span className="hh-label">Menstruation duration of cycle (days)</span><input className="hh-input" name="menstruation_duration_days" type="number" min="0" /></label>
                <SelectField name="menstruation_regular" label="Regular cycle" options={["", "Yes", "No"]} />
                <label><span className="hh-label">Irregular cycle note</span><input className="hh-input" name="menstruation_regular_note" /></label>
                <SelectField name="menstruation_volume" label="Volume" options={["", "Light", "Heavy", "Normal"]} />
                <label><span className="hh-label">Volume note</span><input className="hh-input" name="menstruation_volume_note" /></label>
                <SelectField name="menstruation_color" label="Color" options={["", "Bright red", "Red-red", "Dark red", "Other"]} />
                <label><span className="hh-label">Color other / note</span><input className="hh-input" name="menstruation_color_other" /></label>
                <SelectField name="menstruation_consistency" label="Consistency concern" options={["", "No", "Yes"]} />
                <label><span className="hh-label">Consistency note</span><input className="hh-input" name="menstruation_consistency_note" /></label>
                <ScaleField name="menstruation_pain_scale" label="Pain scale" minLabel="No pain" maxLabel="Worst pain" />
                <label><span className="hh-label">Pain note</span><input className="hh-input" name="menstruation_pain_note" /></label>
                <label><span className="hh-label">Concomitants</span><input className="hh-input" name="concomitants" /></label>
                <label><span className="hh-label">Menarche age</span><input className="hh-input" name="menarche_age" type="number" min="0" /></label>
                <label><span className="hh-label">PMS symptoms</span><textarea className="hh-input min-h-20" name="pms_symptoms" /></label>
                <label><span className="hh-label">Pregnancies</span><input className="hh-input" name="pregnancies" type="number" min="0" /></label>
                <label><span className="hh-label">Menopause</span><textarea className="hh-input min-h-20" name="menopause" /></label>
                <SelectField name="genitals_eruption" label="Genital eruption" options={["", "No", "Yes"]} />
                <label><span className="hh-label">Eruption note</span><input className="hh-input" name="genitals_eruption_note" /></label>
                <SelectField name="genitals_discharge" label="Genital discharge" options={["", "No", "Yes"]} />
                <label><span className="hh-label">Discharge note</span><input className="hh-input" name="genitals_discharge_note" /></label>
                <SelectField name="genitals_infections" label="Genital infections" options={["", "No", "Yes"]} />
                <label><span className="hh-label">Sexual activity</span><textarea className="hh-input min-h-20" name="sexual_activity" placeholder="Libido, STI history, relevant notes" /></label>
              </>
            )}
            <SelectField name="sleep_pattern" label="Sleep pattern" options={["", "Regular", "Irregular"]} />
            <label><span className="hh-label">Sleep pattern note</span><input className="hh-input" name="sleep_pattern_note" /></label>
            <label><span className="hh-label">Sleep quality (hours per day)</span><input className="hh-input" name="sleep_quality_hours" type="number" min="0" step="0.5" /></label>
            <SelectField name="sleep_position" label="Sleep position" options={["", "Back", "Stomach", "Left", "Right"]} />
            <label><span className="hh-label">Dreams</span><textarea className="hh-input min-h-20" name="dreams" /></label>
            <SelectField name="energy_status" label="Energy" options={["", "Increased", "Decreased", "Normal"]} />
            <SelectField name="weather_preference" label="Weather preference" options={["", "Cold", "Hot"]} />
            <label><span className="hh-label">Weather note</span><input className="hh-input" name="weather_note" /></label>
            <label className="md:col-span-2"><span className="hh-label">Mental / personality review</span><textarea className="hh-input min-h-28" name="mental_state" placeholder="Self-description, fears, personality, anxiety, worries, anger, relationships" /></label>
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

      <section className={activeStep.id === "follow-up" || (!isFollowUp && activeStep.id === "decision") ? "hh-panel p-5" : "hidden"}>
        <FormSectionHeader className="mb-4" icon={FileText} title={isFollowUp ? "Evaluation (follow up)" : "Clinical notes"} description={isFollowUp ? "Record response to previous remedy and changes since the last consult." : "Capture examination, diagnosis, remedy, and recommendations."} tone="notes" />
        {isFollowUp ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label><span className="hh-label">Symptoms of previous consult</span><textarea className="hh-input min-h-28" name="previous_consult_symptoms" /></label>
            <label><span className="hh-label">Evaluation on previous complaint</span><textarea className="hh-input min-h-28" name="evaluation_previous_complaint" placeholder="New symptoms that may have appeared since remedy" /></label>
            <ScaleWithNote name="energy_since_remedy" scoreName="energy_since_remedy_score" label="Energy since remedy" minLabel="Worse" maxLabel="Much better" placeholder="Any changes since remedy: how, when, and how much" />
            <ScaleWithNote name="appetite_since_remedy" scoreName="appetite_since_remedy_score" label="Appetite since remedy" minLabel="Worse" maxLabel="Much better" />
            <ScaleWithNote name="sleep_since_remedy" scoreName="sleep_since_remedy_score" label="Sleep since remedy" minLabel="Worse" maxLabel="Much better" />
            <ScaleWithNote name="mental_since_remedy" scoreName="mental_since_remedy_score" label="Mental state since remedy" minLabel="Worse" maxLabel="Much better" placeholder="How have they been feeling after the remedy?" />
            <label><span className="hh-label">Dietary changes</span><textarea className="hh-input min-h-20" name="dietary_changes" /></label>
            <label><span className="hh-label">Lifestyle changes</span><textarea className="hh-input min-h-20" name="lifestyle_changes" /></label>
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
        <section className={activeStep.id === "decision" ? "hh-panel p-5" : "hidden"}>
          <FormSectionHeader className="mb-4" icon={FileText} title="New clinical decision" description="Record the updated diagnosis, remedy, and recommendations." tone="notes" />
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="secondary" onClick={() => setActiveStepIndex((value) => Math.max(0, value - 1))} disabled={isFirstStep}>
          <ChevronLeft size={17} />
          Back
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
    </form>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <label>
      <span className="hh-label">{label}</span>
      <select className="hh-input" name={name}>
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
  placeholder
}: {
  name: string;
  scoreName: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-3">
      <ScaleField name={scoreName} label={`${label} score`} minLabel={minLabel} maxLabel={maxLabel} />
      <label>
        <span className="hh-label">{label} notes</span>
        <textarea className="hh-input min-h-20" name={name} placeholder={placeholder} />
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
