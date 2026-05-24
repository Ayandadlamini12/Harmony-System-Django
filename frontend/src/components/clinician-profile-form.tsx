import type { ClinicianProfile, ClinicianProfileEntry } from "@/types/clinic";
import type React from "react";

import { StepForm } from "@/components/step-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateClinicianProfile } from "@/app/account/actions";

const fieldClass = "grid gap-1.5";
const twoColumn = "grid gap-4 md:grid-cols-2";
const threeColumn = "grid gap-4 md:grid-cols-3";

function entry(entries: ClinicianProfileEntry[] | undefined, index: number, key: string) {
  return String(entries?.[index]?.[key] || "");
}

function SectionRows({
  title,
  children,
}: {
  title: string;
  children: (index: number) => React.ReactNode;
}) {
  return (
    <div className="grid gap-5">
      {[0, 1, 2].map((index) => (
        <div key={index} className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
          <p className="mb-3 text-xs font-bold uppercase text-[#66736d]">
            {title} {index + 1}
          </p>
          {children(index)}
        </div>
      ))}
    </div>
  );
}

export function ClinicianProfileForm({ profile }: { profile: ClinicianProfile | null }) {
  const education = profile?.education || [];
  const career = profile?.career_details || [];
  const awards = profile?.awards_certifications || [];
  const affiliations = profile?.affiliations || [];

  const steps = [
    {
      id: "personal",
      title: "Personal details",
      description: "Professional identity, contact details, clinical interests, and summary.",
      content: (
        <div className={twoColumn}>
          <label className={fieldClass}>
            <Label>Professional title</Label>
            <Input name="professional_title" defaultValue={profile?.professional_title || ""} placeholder="Doctor of Homeopathy" />
          </label>
          <label className={fieldClass}>
            <Label>Display name</Label>
            <Input name="display_name" defaultValue={profile?.display_name || profile?.user_name || ""} placeholder="Dr. Name Surname" />
          </label>
          <label className={fieldClass}>
            <Label>Professional email</Label>
            <Input name="professional_email" type="email" defaultValue={profile?.professional_email || ""} />
          </label>
          <label className={fieldClass}>
            <Label>Professional phone</Label>
            <Input name="professional_phone" defaultValue={profile?.professional_phone || ""} />
          </label>
          <label className={`${fieldClass} md:col-span-2`}>
            <Label>Clinical interests</Label>
            <Input name="clinical_interests" defaultValue={profile?.clinical_interests || ""} placeholder="Chronic care, family wellness, women's health" />
          </label>
          <label className={`${fieldClass} md:col-span-2`}>
            <Label>Professional summary</Label>
            <Textarea name="bio" defaultValue={profile?.bio || ""} rows={5} />
          </label>
        </div>
      ),
    },
    {
      id: "education",
      title: "Education",
      description: "Degrees, diplomas, institutions, and training notes.",
      content: (
        <SectionRows title="Education">
          {(index) => (
            <div className={threeColumn}>
              <label className={fieldClass}><Label>Qualification</Label><Input name="education_qualification" defaultValue={entry(education, index, "qualification")} /></label>
              <label className={fieldClass}><Label>Institution</Label><Input name="education_institution" defaultValue={entry(education, index, "institution")} /></label>
              <label className={fieldClass}><Label>Start year</Label><Input name="education_start_year" defaultValue={entry(education, index, "start_year")} /></label>
              <label className={fieldClass}><Label>End year</Label><Input name="education_end_year" defaultValue={entry(education, index, "end_year")} /></label>
              <label className={`${fieldClass} md:col-span-2`}><Label>Notes</Label><Input name="education_notes" defaultValue={entry(education, index, "notes")} /></label>
            </div>
          )}
        </SectionRows>
      ),
    },
    {
      id: "career",
      title: "Career details",
      description: "Clinical roles, organizations, dates, and responsibilities.",
      content: (
        <SectionRows title="Career role">
          {(index) => (
            <div className={threeColumn}>
              <label className={fieldClass}><Label>Role</Label><Input name="career_role" defaultValue={entry(career, index, "role")} /></label>
              <label className={fieldClass}><Label>Organization</Label><Input name="career_organization" defaultValue={entry(career, index, "organization")} /></label>
              <label className={fieldClass}><Label>Start year</Label><Input name="career_start_year" defaultValue={entry(career, index, "start_year")} /></label>
              <label className={fieldClass}><Label>End year</Label><Input name="career_end_year" defaultValue={entry(career, index, "end_year")} placeholder="Present" /></label>
              <label className={`${fieldClass} md:col-span-2`}><Label>Responsibilities</Label><Input name="career_responsibilities" defaultValue={entry(career, index, "responsibilities")} /></label>
            </div>
          )}
        </SectionRows>
      ),
    },
    {
      id: "awards",
      title: "Awards / certifications",
      description: "Awards, licenses, certificates, and continuing development.",
      content: (
        <SectionRows title="Award or certification">
          {(index) => (
            <div className={threeColumn}>
              <label className={fieldClass}><Label>Title</Label><Input name="award_title" defaultValue={entry(awards, index, "title")} /></label>
              <label className={fieldClass}><Label>Issuer</Label><Input name="award_issuer" defaultValue={entry(awards, index, "issuer")} /></label>
              <label className={fieldClass}><Label>Year</Label><Input name="award_year" defaultValue={entry(awards, index, "year")} /></label>
              <label className={fieldClass}><Label>Expiry</Label><Input name="award_expiry" defaultValue={entry(awards, index, "expiry")} /></label>
              <label className={`${fieldClass} md:col-span-2`}><Label>Notes</Label><Input name="award_notes" defaultValue={entry(awards, index, "notes")} /></label>
            </div>
          )}
        </SectionRows>
      ),
    },
    {
      id: "affiliations",
      title: "Affiliations",
      description: "Professional bodies, societies, boards, committees, and status.",
      content: (
        <SectionRows title="Affiliation">
          {(index) => (
            <div className={threeColumn}>
              <label className={fieldClass}><Label>Organization</Label><Input name="affiliation_organization" defaultValue={entry(affiliations, index, "organization")} /></label>
              <label className={fieldClass}><Label>Role</Label><Input name="affiliation_role" defaultValue={entry(affiliations, index, "role")} placeholder="Member" /></label>
              <label className={fieldClass}><Label>Start year</Label><Input name="affiliation_start_year" defaultValue={entry(affiliations, index, "start_year")} /></label>
              <label className={fieldClass}><Label>Status</Label><Input name="affiliation_status" defaultValue={entry(affiliations, index, "status")} placeholder="Active" /></label>
              <label className={`${fieldClass} md:col-span-2`}><Label>Notes</Label><Input name="affiliation_notes" defaultValue={entry(affiliations, index, "notes")} /></label>
            </div>
          )}
        </SectionRows>
      ),
    },
  ];

  return (
    <form action={updateClinicianProfile}>
      <StepForm steps={steps} submitLabel="Save clinician profile" />
    </form>
  );
}
