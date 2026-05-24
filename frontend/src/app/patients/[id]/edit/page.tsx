import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConditionChecklist } from "@/components/condition-checklist";
import { NextOfKinFields } from "@/components/next-of-kin-fields";
import { PhoneNumberInput } from "@/components/phone-number-input";
import { getPatient } from "@/lib/api";

import { updatePatient } from "./actions";

const fieldClass = "block";
const gridClass = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";

export default async function EditPatientPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const submit = updatePatient.bind(null, id);
  const profile = patient.profile;

  return (
    <AppShell
      title={`Edit ${patient.full_name_display}`}
      action={<Button asChild variant="secondary"><Link href={`/patients/${patient.id}`}>Back to patient</Link></Button>}
    >
      {query.error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{query.error}</div>}
      <form action={submit} className="grid gap-6">
        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Identity</h2>
          <div className={gridClass}>
            <label className={fieldClass}><Label>First name</Label><Input name="first_name" defaultValue={patient.first_name} required /></label>
            <label className={fieldClass}><Label>Middle name</Label><Input name="middle_name" defaultValue={patient.middle_name || ""} /></label>
            <label className={fieldClass}><Label>Last name</Label><Input name="last_name" defaultValue={patient.last_name} required /></label>
            <label className={fieldClass}><Label>National / Passport ID</Label><Input name="national_id" defaultValue={patient.national_id || ""} /></label>
            <label className={fieldClass}><Label>Date of birth</Label><Input name="date_of_birth" type="date" defaultValue={patient.date_of_birth || ""} /></label>
            <label className={fieldClass}>
              <Label>Gender</Label>
              <Select name="gender" defaultValue={patient.gender}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </Select>
            </label>
            <label className={fieldClass}>
              <Label>Status</Label>
              <Select name="status" defaultValue={patient.status}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </Select>
            </label>
          </div>
        </section>

        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Contact and location</h2>
          <div className={gridClass}>
            <PhoneNumberInput label="Primary phone" name="primary_phone" defaultValue={patient.primary_phone || ""} required />
            <PhoneNumberInput label="Secondary phone" name="secondary_phone" defaultValue={patient.secondary_phone || ""} />
            <label className={fieldClass}><Label>Email</Label><Input name="email" type="email" defaultValue={patient.email || ""} /></label>
            <label className={fieldClass}><Label>Region</Label><Input name="region" defaultValue={patient.region || ""} /></label>
            <label className={fieldClass}><Label>Town or locality</Label><Input name="town_or_locality" defaultValue={patient.town_or_locality || ""} /></label>
            <label className={fieldClass}><Label>Village</Label><Input name="village" defaultValue={patient.village || ""} /></label>
          </div>
        </section>

        <section className="hh-panel p-5">
          <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Next of kin</h2>
          <NextOfKinFields
            defaultFullName={patient.next_of_kin_full_name || ""}
            defaultPhone={patient.next_of_kin_phone || ""}
            defaultEmail={patient.next_of_kin_email || ""}
            defaultRelationship={patient.next_of_kin_relationship || ""}
            defaultRelationshipOther={patient.next_of_kin_relationship_other || ""}
          />
        </section>

        {profile ? (
          <>
            <section className="hh-panel p-5">
              <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Clinical profile</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className={fieldClass}>
                  <Label>HIV status</Label>
                  <Select name="hiv_status" defaultValue={profile.hiv_status}>
                    <option value="undisclosed">Undisclosed</option>
                    <option value="unknown">Unknown</option>
                    <option value="reactive">Reactive</option>
                    <option value="non_reactive">Non-reactive</option>
                  </Select>
                </label>
                <label className={fieldClass}><Label>Children count</Label><Input name="children_count" type="number" min="0" defaultValue={profile.children_count ?? ""} /></label>
                <label className={fieldClass}><Label>Past medical history</Label><Textarea name="past_medical_history" defaultValue={profile.past_medical_history || ""} /></label>
                <label className={fieldClass}><Label>Family medical history</Label><Textarea name="family_medical_history" defaultValue={profile.family_medical_history || ""} /></label>
                <label className={fieldClass}><Label>Allopathic medication</Label><Textarea name="allopathic_medication" defaultValue={profile.allopathic_medication || ""} /></label>
                <label className={fieldClass}><Label>Other important information</Label><Textarea name="other_important_information" defaultValue={profile.other_important_information || ""} /></label>
              </div>
            </section>

            <section className="hh-panel p-5">
              <h2 className="mb-4 text-sm font-bold uppercase text-[#66736d]">Confidential sickness records</h2>
              <ConditionChecklist conditions={patient.conditions || []} />
            </section>
          </>
        ) : (
          <section className="hh-panel p-5">
            <h2 className="font-bold">Clinical profile locked</h2>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">This user can edit non-confidential information only. Request elevated access before changing medical history.</p>
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="secondary"><Link href={`/patients/${patient.id}`}>Cancel</Link></Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </AppShell>
  );
}
