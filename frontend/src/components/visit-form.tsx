"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import type { Patient } from "@/types/clinic";

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
  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);

    function val(key: string) { return String(form.get(key) || "").trim(); }
    function num(key: string) { const v = val(key); return v ? Number(v) : null; }

    const body = {
      patient: Number(val("patient")),
      visit_type: val("visit_type") || "new_consultation",
      visit_date: val("visit_date"),
      visit_time: val("visit_time") || null,
      main_complaint: val("main_complaint"),
      initial_complaints: val("initial_complaints"),
      physical_examination: val("physical_examination"),
      diagnosis: val("diagnosis"),
      remedy: val("remedy"),
      reason_for_remedy: val("reason_for_remedy"),
      dietary_recommendation: val("dietary_recommendation"),
      lifestyle_recommendation: val("lifestyle_recommendation"),
      vitals: {
        bp_first_reading: val("bp_first_reading"),
        bp_second_reading: val("bp_second_reading"),
        pulse: num("pulse"),
        resp_rate: num("resp_rate"),
        temperature: num("temperature"),
        weight: num("weight"),
        glucose_mmol_l: num("glucose_mmol_l"),
        glucose_context: val("glucose_context") || "unknown",
        glucose_food_type: val("glucose_food_type"),
        medication_taken_status: "unknown",
      },
    };

    const res = await fetch("/api/visits/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
            <select className="hh-input" name="patient" defaultValue={patientId || ""} required>
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
            <select className="hh-input" name="visit_type" defaultValue={defaultVisitType}>
              <option value="new_consultation">New consultation</option>
              <option value="follow_up">Follow up</option>
              <option value="review">Review</option>
            </select>
          </label>
          <label><span className="hh-label">Visit date</span><input className="hh-input" name="visit_date" type="date" defaultValue={today} required /></label>
          <label><span className="hh-label">Visit time</span><input className="hh-input" name="visit_time" type="time" /></label>
          <label className="md:col-span-2"><span className="hh-label">Main complaint</span><input className="hh-input" name="main_complaint" required /></label>
        </div>
      </section>

      <section className="hh-panel p-5">
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Vitals</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <label><span className="hh-label">BP first</span><input className="hh-input" name="bp_first_reading" placeholder="120" /></label>
          <label><span className="hh-label">BP second</span><input className="hh-input" name="bp_second_reading" placeholder="80" /></label>
          <label><span className="hh-label">Pulse</span><input className="hh-input" name="pulse" type="number" min="0" /></label>
          <label><span className="hh-label">Resp. rate</span><input className="hh-input" name="resp_rate" type="number" min="0" /></label>
          <label><span className="hh-label">Temperature</span><input className="hh-input" name="temperature" type="number" step="0.1" /></label>
          <label><span className="hh-label">Weight</span><input className="hh-input" name="weight" type="number" step="0.1" /></label>
          <label><span className="hh-label">Glucose</span><input className="hh-input" name="glucose_mmol_l" type="number" step="0.1" /></label>
          <label><span className="hh-label">Food type</span><input className="hh-input" name="glucose_food_type" placeholder="e.g. porridge, bread, fruit" /></label>
          <label>
            <span className="hh-label">Glucose context</span>
            <select className="hh-input" name="glucose_context" defaultValue="unknown">
              <option value="unknown">Unknown</option>
              <option value="fasting">Fasting</option>
              <option value="after_meals">After meals</option>
            </select>
          </label>
        </div>
      </section>

      <section className="hh-panel p-5">
        <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Clinical notes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label><span className="hh-label">Initial complaints</span><textarea className="hh-input min-h-28" name="initial_complaints" /></label>
          <label><span className="hh-label">Physical examination</span><textarea className="hh-input min-h-28" name="physical_examination" /></label>
          <label><span className="hh-label">Diagnosis</span><textarea className="hh-input min-h-28" name="diagnosis" /></label>
          <label><span className="hh-label">Remedy</span><textarea className="hh-input min-h-28" name="remedy" /></label>
          <label><span className="hh-label">Reason for remedy</span><textarea className="hh-input min-h-28" name="reason_for_remedy" /></label>
          <label><span className="hh-label">Dietary recommendation</span><textarea className="hh-input min-h-28" name="dietary_recommendation" /></label>
          <label><span className="hh-label">Lifestyle recommendation</span><textarea className="hh-input min-h-28" name="lifestyle_recommendation" /></label>
        </div>
      </section>

      <div>
        <LoadingButton type="submit" loading={loading} loadingText="Saving visit...">
          {!loading && <Save size={17} />}
          Save visit
        </LoadingButton>
      </div>
    </form>
  );
}
