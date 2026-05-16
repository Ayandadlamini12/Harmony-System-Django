import { Save } from "lucide-react";

import { AppShell } from "@/components/app-shell";

export default function NewPatientPage() {
  return (
    <AppShell title="Register patient">
      <form className="grid gap-6">
        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Identity</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label><span className="hh-label">First name</span><input className="hh-input" name="first_name" /></label>
            <label><span className="hh-label">Middle name</span><input className="hh-input" name="middle_name" /></label>
            <label><span className="hh-label">Last name</span><input className="hh-input" name="last_name" /></label>
            <label><span className="hh-label">National ID</span><input className="hh-input" name="national_id" /></label>
            <label><span className="hh-label">Date of birth</span><input className="hh-input" name="date_of_birth" type="date" /></label>
            <label>
              <span className="hh-label">Gender</span>
              <select className="hh-input" name="gender" defaultValue="female">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>
          </div>
        </section>

        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Contact</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label><span className="hh-label">Primary phone</span><input className="hh-input" name="primary_phone" /></label>
            <label><span className="hh-label">Secondary phone</span><input className="hh-input" name="secondary_phone" /></label>
            <label><span className="hh-label">Region</span><input className="hh-input" name="region" /></label>
            <label><span className="hh-label">Town or locality</span><input className="hh-input" name="town_or_locality" /></label>
            <label><span className="hh-label">Village</span><input className="hh-input" name="village" /></label>
          </div>
        </section>

        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Clinical profile</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="hh-label">HIV status</span>
              <select className="hh-input" name="hiv_status" defaultValue="undisclosed">
                <option value="undisclosed">Undisclosed</option>
                <option value="unknown">Unknown</option>
                <option value="reactive">Reactive</option>
                <option value="non_reactive">Non-reactive</option>
              </select>
            </label>
            <label><span className="hh-label">Children count</span><input className="hh-input" name="children_count" type="number" min="0" /></label>
            <label><span className="hh-label">Past medical history</span><textarea className="hh-input min-h-28" name="past_medical_history" /></label>
            <label><span className="hh-label">Family medical history</span><textarea className="hh-input min-h-28" name="family_medical_history" /></label>
          </div>
        </section>

        <div>
          <button className="hh-button" type="button"><Save size={17} /> Save draft UI</button>
        </div>
      </form>
    </AppShell>
  );
}
