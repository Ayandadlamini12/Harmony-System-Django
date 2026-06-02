"use client";

import { HeartPulse, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormSectionHeader } from "@/components/form-section-header";
import { LoadingButton } from "@/components/harmony-loading";
import { showActionError } from "@/lib/action-error";
import type { Patient, Visit } from "@/types/clinic";

export function VitalsForm({
  patients,
  visits,
  patientId,
  visitId,
  lockedPatient = false,
  onSaved,
}: {
  patients: Patient[];
  visits: Visit[];
  patientId?: string;
  visitId?: string;
  lockedPatient?: boolean;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [selectedPatient, setSelectedPatient] = useState(patientId || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const defaultRecordedAt = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const filteredVisits = useMemo(() => {
    if (!selectedPatient) return visits;
    return visits.filter((visit) => String(visit.patient) === selectedPatient);
  }, [selectedPatient, visits]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const val = (key: string) => String(form.get(key) || "").trim();
    const num = (key: string) => {
      const value = val(key);
      return value ? Number(value) : null;
    };

    const body = {
      visit: Number(val("visit")),
      bp_first_reading: val("bp_first_reading"),
      bp_second_reading: val("bp_second_reading"),
      pulse: num("pulse"),
      resp_rate: num("resp_rate"),
      temperature: num("temperature"),
      weight: num("weight"),
      glucose_mmol_l: num("glucose_mmol_l"),
      glucose_context: val("glucose_context") || "unknown",
      glucose_food_type: val("glucose_food_type"),
      medication_taken_status: val("medication_taken_status") || "unknown",
      recorded_at: val("recorded_at") ? new Date(val("recorded_at")).toISOString() : undefined,
    };

    const response = await fetch("/api/vitals/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (data.success) {
      toast.success("Vitals saved");
      onSaved?.();
      if (!onSaved) {
        router.push("/vitals/new");
      }
      router.refresh();
    } else {
      setError("save_failed");
      showActionError({
        title: "Vitals could not be saved",
        message: data.detail || "The vitals could not be saved. Select a visit and check the recorded values."
      });
      setLoading(false);
    }
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          The vitals could not be saved. Select a visit and check the recorded values.
        </div>
      )}

      <section className="hh-panel p-5">
        <FormSectionHeader className="mb-4" icon={HeartPulse} title="Vitals context" description="Link the vitals record to the correct patient, visit, date, and time." tone="vitals" />
        <div className="grid gap-4 md:grid-cols-3">
          {lockedPatient ? (
            <input name="patient" type="hidden" value={selectedPatient} />
          ) : (
            <label>
              <span className="hh-label">Patient</span>
              <select className="hh-input" name="patient" value={selectedPatient} onChange={(event) => setSelectedPatient(event.target.value)}>
                <option value="">All patients</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name_display} - {patient.patient_code}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className="hh-label">Visit</span>
            <select className="hh-input" name="visit" defaultValue={visitId || ""} required>
              <option value="">Select visit</option>
              {filteredVisits.map((visit) => (
                <option key={visit.id} value={visit.id}>
                  {visit.patient_name || "Patient"} - {visit.visit_date} - {visit.visit_type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="hh-label">Recorded date and time</span>
            <input className="hh-input" name="recorded_at" type="datetime-local" defaultValue={defaultRecordedAt} required />
          </label>
        </div>
      </section>

      <section className="hh-panel p-5">
        <FormSectionHeader className="mb-4" icon={HeartPulse} title="Measurements" description="Record blood pressure, pulse, temperature, weight, glucose, and related context." tone="vitals" />
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
          <label>
            <span className="hh-label">Medication taken</span>
            <select className="hh-input" name="medication_taken_status" defaultValue="unknown">
              <option value="unknown">Unknown</option>
              <option value="taken">Taken</option>
              <option value="not_taken">Not taken</option>
            </select>
          </label>
        </div>
      </section>

      <div>
        <LoadingButton type="submit" loading={loading} loadingText="Saving vitals...">
          {!loading && <Save size={17} />}
          Save vitals
        </LoadingButton>
      </div>
    </form>
  );
}
