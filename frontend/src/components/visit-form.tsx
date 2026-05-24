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
