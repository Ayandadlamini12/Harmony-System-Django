import { AppShell } from "@/components/app-shell";
import { StepForm } from "@/components/step-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createPatient } from "./actions";

export default async function NewPatientPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const fieldClass = "grid gap-1.5";
  const twoColumn = "grid gap-4 md:grid-cols-2";
  const threeColumn = "grid gap-4 md:grid-cols-3";
  const steps = [
    {
      id: "identity",
      title: "Identity",
      description: "Name, ID, date of birth, and gender.",
      content: (
        <div className={threeColumn}>
          <label className={fieldClass}><Label>First name</Label><Input name="first_name" required /></label>
          <label className={fieldClass}><Label>Middle name</Label><Input name="middle_name" /></label>
          <label className={fieldClass}><Label>Last name</Label><Input name="last_name" required /></label>
          <label className={fieldClass}><Label>National ID</Label><Input name="national_id" /></label>
          <label className={fieldClass}><Label>Date of birth</Label><Input name="date_of_birth" type="date" /></label>
          <label className={fieldClass}>
            <Label>Gender</Label>
            <Select name="gender" defaultValue="female">
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
          </label>
        </div>
      )
    },
    {
      id: "contact",
      title: "Contact and location",
      description: "Phones, region, locality, and village.",
      content: (
        <div className={threeColumn}>
          <label className={fieldClass}><Label>Primary phone</Label><Input name="primary_phone" /></label>
          <label className={fieldClass}><Label>Secondary phone</Label><Input name="secondary_phone" /></label>
          <label className={fieldClass}><Label>Region</Label><Input name="region" /></label>
          <label className={fieldClass}><Label>Town or locality</Label><Input name="town_or_locality" /></label>
          <label className={fieldClass}><Label>Village</Label><Input name="village" /></label>
        </div>
      )
    },
    {
      id: "clinical",
      title: "Clinical profile",
      description: "Semi-stable medical history and important patient notes.",
      content: (
        <div className={twoColumn}>
          <label className={fieldClass}>
            <Label>HIV status</Label>
            <Select name="hiv_status" defaultValue="undisclosed">
              <option value="undisclosed">Undisclosed</option>
              <option value="unknown">Unknown</option>
              <option value="reactive">Reactive</option>
              <option value="non_reactive">Non-reactive</option>
            </Select>
          </label>
          <label className={fieldClass}><Label>Children count</Label><Input name="children_count" type="number" min="0" /></label>
          <label className={fieldClass}><Label>Past medical history</Label><Textarea name="past_medical_history" /></label>
          <label className={fieldClass}><Label>Family medical history</Label><Textarea name="family_medical_history" /></label>
          <label className={fieldClass}><Label>Allopathic medication</Label><Textarea name="allopathic_medication" /></label>
          <label className={fieldClass}><Label>Other important information</Label><Textarea name="other_important_information" /></label>
        </div>
      )
    },
    {
      id: "review",
      title: "Review and save",
      description: "Confirm the intake details before creating the patient record.",
      content: (
        <div className="rounded-lg border border-dashed border-[var(--hh-border)] bg-[#f7faf8] p-5">
          <h3 className="text-base font-bold">Ready to save</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736d]">
            Use Back to review each section. The system will generate the patient code automatically if one was not provided.
          </p>
        </div>
      )
    }
  ];

  return (
    <AppShell title="Register patient">
      {params.error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          The record could not be saved. Check required fields and duplicate ID values.
        </div>
      )}

      <form action={createPatient}>
        <StepForm steps={steps} submitLabel="Save patient" />
      </form>
    </AppShell>
  );
}
