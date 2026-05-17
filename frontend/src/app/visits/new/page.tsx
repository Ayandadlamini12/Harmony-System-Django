import { Save } from "lucide-react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getPatients } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function NewVisitPage({ searchParams }: { searchParams: Promise<{ error?: string; patient?: string }> }) {
  const session = await getSessionUser();
  if (!session.signedIn) redirect("/login");

  const [params, patients] = await Promise.all([searchParams, getPatients()]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell title="Add visit">
      {params.error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          The visit could not be saved. Choose a patient, visit date, and main complaint.
        </div>
      )}

      <form action="/api/visits/create" method="post" className="grid gap-6">
        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Visit details</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="hh-label">Patient</span>
              <select className="hh-input" name="patient" defaultValue={params.patient || ""} required>
                <option value="">Select patient</option>
                {patients.results.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name_display} - {patient.patient_code}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="hh-label">Visit type</span>
              <select className="hh-input" name="visit_type" defaultValue="new_consultation">
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
          <button className="hh-button" type="submit"><Save size={17} /> Save visit</button>
        </div>
      </form>
    </AppShell>
  );
}
