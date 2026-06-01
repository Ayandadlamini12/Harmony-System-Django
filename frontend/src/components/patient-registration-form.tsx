"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormStepWheel } from "@/components/form-step-wheel";
import { LoadingButton } from "@/components/harmony-loading";
import { countryCodeOptions, resolveCountryFromDialCode } from "@/components/phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import { cn } from "@/lib/utils";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationships";


type RegionOption = {
  name: string;
  isoCode: string;
};

const phoneSchema = z.object({
  country_code: z.string().regex(/^\+\d{1,4}$/, "Use a valid country code"),
  number: z.string().regex(/^\d{6,15}$/, "Use digits only, 6 to 15 numbers")
});

const optionalPhoneSchema = z.object({
  country_code: z.string().regex(/^\+\d{1,4}$/, "Use a valid country code"),
  number: z.string()
}).superRefine((value, context) => {
  if (value.number && !/^\d{6,15}$/.test(value.number)) {
    context.addIssue({ code: "custom", path: ["number"], message: "Use digits only, 6 to 15 numbers" });
  }
});

const patientRegistrationSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  middle_name: z.string().trim().optional(),
  last_name: z.string().trim().min(1, "Last name is required"),
  national_id: z.string().trim().regex(/^[A-Za-z0-9 -]*$/, "National / Passport ID must be alphanumeric"),
  date_of_birth: z.string().optional(),
  gender: z.enum(["female", "male", "other", "prefer_not_to_say"]),
  marital_status: z.string().trim(),
  occupation: z.string().trim(),
  allergies: z.string().trim(),
  smoking_status: z.enum(["", "yes", "no", "former"]),
  smoking_details: z.string().trim(),
  smoking_years: z.string().trim(),
  alcohol_status: z.enum(["", "yes", "no", "former"]),
  alcohol_details: z.string().trim(),
  primary_phone: phoneSchema,
  secondary_phone: optionalPhoneSchema,
  email: z.string().trim().email("Use a valid email").or(z.literal("")),
  region: z.string().trim(),
  town_or_locality: z.string().trim(),
  village: z.string().trim(),
  next_of_kin_full_name: z.string().trim(),
  next_of_kin_phone: optionalPhoneSchema,
  next_of_kin_email: z.string().trim().email("Use a valid email").or(z.literal("")),
  next_of_kin_relationship: z.string().trim(),
  next_of_kin_relationship_other: z.string().trim(),
  hiv_status: z.enum(["undisclosed", "unknown", "reactive", "non_reactive"]),
  children_count: z.string().trim(),
  past_medical_history: z.string().trim(),
  family_medical_history: z.string().trim(),
  allopathic_medication: z.string().trim(),
  other_important_information: z.string().trim(),
  conditions: z.record(z.string(), z.object({
    status: z.enum(["yes", "no"]),
    note: z.string().trim()
  }))
});

type PatientRegistrationValues = z.infer<typeof patientRegistrationSchema>;

const fieldClass = "grid gap-1.5";
const twoColumn = "grid gap-4 md:grid-cols-2";
const threeColumn = "grid gap-4 md:grid-cols-3";

function text(value?: string) {
  return (value || "").trim();
}

function phoneValue(phone: { country_code: string; number: string }) {
  const number = phone.number.replace(/\D/g, "");
  if (!number) return "";
  return `${phone.country_code || "+268"}${number}`;
}

function FieldError({ message }: { message?: string }) {
  return (
    <span aria-hidden={!message} className={cn("min-h-4 text-xs font-semibold leading-4 text-red-600", !message && "invisible")}>
      {message || "No validation error"}
    </span>
  );
}

export function PatientRegistrationForm() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const form = useForm<PatientRegistrationValues>({
    resolver: zodResolver(patientRegistrationSchema),
    mode: "onBlur",
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      national_id: "",
      date_of_birth: "",
      gender: "female",
      marital_status: "",
      occupation: "",
      allergies: "",
      smoking_status: "",
      smoking_details: "",
      smoking_years: "",
      alcohol_status: "",
      alcohol_details: "",
      primary_phone: { country_code: "+268", number: "" },
      secondary_phone: { country_code: "+268", number: "" },
      email: "",
      region: "",
      town_or_locality: "",
      village: "",
      next_of_kin_full_name: "",
      next_of_kin_phone: { country_code: "+268", number: "" },
      next_of_kin_email: "",
      next_of_kin_relationship: "",
      next_of_kin_relationship_other: "",
      hiv_status: "undisclosed",
      children_count: "",
      past_medical_history: "",
      family_medical_history: "",
      allopathic_medication: "",
      other_important_information: "",
      conditions: Object.fromEntries(CONFIDENTIAL_CONDITIONS.map((condition) => [condition.code, { status: "no", note: "" }]))
    }
  });

  const primaryDialCode = form.watch("primary_phone.country_code");
  const selectedRegion = form.watch("region");
  const relationship = form.watch("next_of_kin_relationship");
  const conditionValues = form.watch("conditions");
  const selectedCountry = useMemo(() => resolveCountryFromDialCode(primaryDialCode || "+268"), [primaryDialCode]);
  const selectedRegionIsoCode = regions.find((region) => region.name === selectedRegion)?.isoCode || "";

  useEffect(() => {
    const controller = new AbortController();
    async function loadLocations() {
      const params = new URLSearchParams({ country: selectedCountry });
      if (selectedRegionIsoCode) {
        params.set("state", selectedRegionIsoCode);
      }
      const response = await fetch(`/api/locations?${params.toString()}`, { signal: controller.signal });
      if (!response.ok) return;
      const data = (await response.json()) as { regions?: RegionOption[]; towns?: string[] };
      setRegions(data.regions || []);
      setTowns(data.towns || []);
    }
    loadLocations().catch(() => {
      if (!controller.signal.aborted) {
        setRegions([]);
        setTowns([]);
      }
    });
    return () => controller.abort();
  }, [selectedCountry, selectedRegionIsoCode]);

  const allSteps = [
    {
      id: "identity",
      title: "Identity",
      description: "Name, ID, date of birth, and gender.",
      fields: ["first_name", "last_name", "national_id", "date_of_birth", "gender", "marital_status", "occupation", "allergies", "smoking_status", "smoking_details", "smoking_years", "alcohol_status", "alcohol_details"] as const
    },
    {
      id: "contact",
      title: "Contact and location",
      description: "Country code, phones, email, region, locality, and village.",
      fields: ["primary_phone", "secondary_phone", "email", "region", "town_or_locality", "village"] as const
    },
    {
      id: "next-of-kin",
      title: "Next of kin",
      description: "Emergency contact and relationship details.",
      fields: ["next_of_kin_full_name", "next_of_kin_phone", "next_of_kin_email", "next_of_kin_relationship", "next_of_kin_relationship_other"] as const
    },
    {
      id: "clinical",
      title: "Medical history",
      description: "Semi-stable medical history and important patient notes.",
      fields: ["hiv_status", "children_count", "past_medical_history", "family_medical_history", "allopathic_medication", "other_important_information"] as const
    },
    {
      id: "conditions",
      title: "Confidential medical records",
      description: "Sickness record flags. Yes uses a tick; No uses an X.",
      fields: ["conditions"] as const
    },
    {
      id: "review",
      title: "Review and save",
      description: "Confirm the intake details before creating the patient record.",
      fields: [] as const
    }
  ];
  const steps = allSteps;
  const activeStep = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;
  const errors = form.formState.errors;

  async function continueToNextStep() {
    const valid = await form.trigger(activeStep.fields as Parameters<typeof form.trigger>[0], { shouldFocus: true });
    if (valid) setActiveIndex((value) => Math.min(steps.length - 1, value + 1));
  }

  async function onSubmit(values: PatientRegistrationValues) {
    setSaving(true);
    const body: Record<string, unknown> = {
      first_name: text(values.first_name),
      middle_name: text(values.middle_name),
      last_name: text(values.last_name),
      national_id: text(values.national_id) || null,
      email: text(values.email),
      date_of_birth: text(values.date_of_birth) || null,
      gender: values.gender,
      marital_status: text(values.marital_status),
      occupation: text(values.occupation),
      allergies: text(values.allergies),
      smoking_status: text(values.smoking_status),
      smoking_details: text(values.smoking_details),
      smoking_years: text(values.smoking_years) ? Number(text(values.smoking_years)) : null,
      alcohol_status: text(values.alcohol_status),
      alcohol_details: text(values.alcohol_details),
      primary_phone: phoneValue(values.primary_phone),
      secondary_phone: phoneValue(values.secondary_phone),
      next_of_kin_full_name: text(values.next_of_kin_full_name),
      next_of_kin_phone: phoneValue(values.next_of_kin_phone),
      next_of_kin_email: text(values.next_of_kin_email),
      next_of_kin_relationship: text(values.next_of_kin_relationship),
      next_of_kin_relationship_other: text(values.next_of_kin_relationship_other),
      region: text(values.region),
      town_or_locality: text(values.town_or_locality),
      village: text(values.village),
      profile: {
        hiv_status: values.hiv_status,
        children_count: text(values.children_count) ? Number(text(values.children_count)) : null,
        past_medical_history: text(values.past_medical_history),
        family_medical_history: text(values.family_medical_history),
        allopathic_medication: text(values.allopathic_medication),
        other_important_information: text(values.other_important_information)
      },
      conditions: CONFIDENTIAL_CONDITIONS.map((condition) => {
        const value = values.conditions[condition.code] || { status: "no", note: "" };
        const present = value.status === "yes";
        return {
          condition_code: condition.code,
          condition_label: condition.label,
          present,
          is_confidential: true,
          status: "active",
          notes: present ? text(value.note) : ""
        };
      })
    };

    try {
      const response = await fetch("/api/patients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.detail || "The patient record could not be saved.");
        return;
      }
      toast.success("Patient created. Consent signing is the next step.");
      router.push(data.public_id ? `/patients/${data.public_id}` : "/patients");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
      <FormStepWheel steps={steps} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
      <section className="grid gap-5">
        <div className="rounded-lg border border-[var(--hh-border)] bg-white">
          <div className="border-b border-[var(--hh-border)] px-5 py-4">
            <p className="text-xs font-bold uppercase text-[#66736d]">Step {activeIndex + 1} of {steps.length}</p>
            <h2 className="mt-1 text-lg font-bold">{activeStep.title}</h2>
            <p className="mt-1 text-sm text-[#66736d]">{activeStep.description}</p>
          </div>
          <div className="p-5">
            <div className={cn(activeStep.id === "identity" ? "block" : "hidden")}>
              <div className={threeColumn}>
                <label className={fieldClass}><Label>First name</Label><Input {...form.register("first_name")} /><FieldError message={errors.first_name?.message} /></label>
                <label className={fieldClass}><Label>Middle name</Label><Input {...form.register("middle_name")} /><FieldError /></label>
                <label className={fieldClass}><Label>Last name</Label><Input {...form.register("last_name")} /><FieldError message={errors.last_name?.message} /></label>
                <label className={fieldClass}><Label>National / Passport ID</Label><Input autoCapitalize="characters" {...form.register("national_id")} /><FieldError message={errors.national_id?.message} /></label>
                <label className={fieldClass}><Label>Date of birth</Label><Input type="date" {...form.register("date_of_birth")} /><FieldError /></label>
                <label className={fieldClass}>
                  <Label>Gender</Label>
                  <Select {...form.register("gender")}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </Select>
                  <FieldError />
                </label>
                <label className={fieldClass}>
                  <Label>Marital status</Label>
                  <Select {...form.register("marital_status")}>
                    <option value="">Select marital status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                    <option value="separated">Separated</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </Select>
                  <FieldError />
                </label>
                <label className={fieldClass}><Label>Occupation</Label><Input {...form.register("occupation")} /><FieldError /></label>
                <label className={fieldClass}><Label>Allergies</Label><Input placeholder="Known allergies or none" {...form.register("allergies")} /><FieldError /></label>
                <label className={fieldClass}>
                  <Label>Smoking</Label>
                  <Select {...form.register("smoking_status")}>
                    <option value="">Select smoking status</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="former">Former smoker</option>
                  </Select>
                  <FieldError />
                </label>
                <label className={fieldClass}><Label>Smoking type / brand and cigarettes per day</Label><Input {...form.register("smoking_details")} /><FieldError /></label>
                <label className={fieldClass}><Label>Number of smoking years</Label><Input type="number" min="0" {...form.register("smoking_years")} /><FieldError /></label>
                <label className={fieldClass}>
                  <Label>Alcohol</Label>
                  <Select {...form.register("alcohol_status")}>
                    <option value="">Select alcohol status</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                    <option value="former">Former alcohol use</option>
                  </Select>
                  <FieldError />
                </label>
                <label className={fieldClass}><Label>Alcohol type / brand</Label><Input placeholder="e.g. ciders, spirits" {...form.register("alcohol_details")} /><FieldError /></label>
              </div>
            </div>

            <div className={cn(activeStep.id === "contact" ? "block" : "hidden")}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className={fieldClass}>
                  <Label>Primary phone</Label>
                  <div className="grid grid-cols-[92px_minmax(10rem,1fr)] gap-2 max-[420px]:grid-cols-1">
                    <input className="hh-input" list="primary-phone-codes" {...form.register("primary_phone.country_code")} />
                    <Input inputMode="tel" placeholder="7600 0000" {...form.register("primary_phone.number")} />
                  </div>
                  <FieldError message={errors.primary_phone?.country_code?.message || errors.primary_phone?.number?.message} />
                </label>
                <label className={fieldClass}>
                  <Label>Secondary phone</Label>
                  <div className="grid grid-cols-[92px_minmax(10rem,1fr)] gap-2 max-[420px]:grid-cols-1">
                    <input className="hh-input" list="secondary-phone-codes" {...form.register("secondary_phone.country_code")} />
                    <Input inputMode="tel" placeholder="7600 0000" {...form.register("secondary_phone.number")} />
                  </div>
                  <FieldError message={errors.secondary_phone?.country_code?.message || errors.secondary_phone?.number?.message} />
                </label>
                <label className={fieldClass}><Label>Email</Label><Input type="email" {...form.register("email")} /><FieldError message={errors.email?.message} /></label>
                <label className={fieldClass}>
                  <Label>Region / State</Label>
                  {regions.length ? (
                    <Select {...form.register("region")} onChange={(event) => { form.setValue("region", event.currentTarget.value); form.setValue("town_or_locality", ""); }}>
                      <option value="">Select region / state</option>
                      {regions.map((region) => <option key={region.isoCode} value={region.name}>{region.name}</option>)}
                    </Select>
                  ) : (
                    <Input {...form.register("region")} />
                  )}
                  <FieldError />
                </label>
                <label className={fieldClass}>
                  <Label>Town or locality</Label>
                  {regions.length ? (
                    <Select {...form.register("town_or_locality")} disabled={towns.length === 0}>
                      <option value="">{selectedRegion ? "Select town or locality" : "Select town or locality from country"}</option>
                      {towns.map((town) => <option key={town} value={town}>{town}</option>)}
                    </Select>
                  ) : (
                    <Input {...form.register("town_or_locality")} />
                  )}
                  <FieldError />
                </label>
                <label className={fieldClass}><Label>Village / address area</Label><Input {...form.register("village")} /><FieldError /></label>
              </div>
              <datalist id="primary-phone-codes">{countryCodeOptions.map((option) => <option key={`p-${option.country}-${option.dialCode}`} value={option.dialCode}>{option.label}</option>)}</datalist>
              <datalist id="secondary-phone-codes">{countryCodeOptions.map((option) => <option key={`s-${option.country}-${option.dialCode}`} value={option.dialCode}>{option.label}</option>)}</datalist>
            </div>

            <div className={cn(activeStep.id === "next-of-kin" ? "block" : "hidden")}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className={fieldClass}><Label>Next of kin full name(s)</Label><Input {...form.register("next_of_kin_full_name")} /><FieldError /></label>
                <label className={fieldClass}>
                  <Label>Next of kin phone</Label>
                  <div className="grid grid-cols-[92px_minmax(10rem,1fr)] gap-2 max-[420px]:grid-cols-1">
                    <input className="hh-input" list="kin-phone-codes" {...form.register("next_of_kin_phone.country_code")} />
                    <Input inputMode="tel" placeholder="7600 0000" {...form.register("next_of_kin_phone.number")} />
                  </div>
                  <FieldError message={errors.next_of_kin_phone?.country_code?.message || errors.next_of_kin_phone?.number?.message} />
                </label>
                <label className={fieldClass}><Label>Next of kin email</Label><Input type="email" {...form.register("next_of_kin_email")} /><FieldError message={errors.next_of_kin_email?.message} /></label>
                <label className={fieldClass}>
                  <Label>Relationship</Label>
                  <Select {...form.register("next_of_kin_relationship")}>
                    {RELATIONSHIP_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                  <FieldError />
                </label>
                {relationship === "other" && <label className={fieldClass}><Label>Specify relationship</Label><Input {...form.register("next_of_kin_relationship_other")} /><FieldError /></label>}
              </div>
              <datalist id="kin-phone-codes">{countryCodeOptions.map((option) => <option key={`k-${option.country}-${option.dialCode}`} value={option.dialCode}>{option.label}</option>)}</datalist>
            </div>

            <div className={cn(activeStep.id === "clinical" ? "block" : "hidden")}>
              <div className={twoColumn}>
                <label className={fieldClass}>
                  <Label>HIV status</Label>
                  <Select {...form.register("hiv_status")}>
                    <option value="undisclosed">Undisclosed</option>
                    <option value="unknown">Unknown</option>
                    <option value="reactive">Reactive</option>
                    <option value="non_reactive">Non-reactive</option>
                  </Select>
                  <FieldError />
                </label>
                <label className={fieldClass}><Label>Children count</Label><Input type="number" min="0" {...form.register("children_count")} /><FieldError /></label>
                <label className={fieldClass}><Label>Past medical history</Label><Textarea {...form.register("past_medical_history")} /><FieldError /></label>
                <label className={fieldClass}><Label>Family medical history</Label><Textarea {...form.register("family_medical_history")} /><FieldError /></label>
                <label className={fieldClass}><Label>Allopathic medication</Label><Textarea {...form.register("allopathic_medication")} /><FieldError /></label>
                <label className={fieldClass}><Label>Other important information</Label><Textarea {...form.register("other_important_information")} /><FieldError /></label>
              </div>
            </div>

            <div className={cn(activeStep.id === "conditions" ? "block" : "hidden")}>
              <div className="grid gap-4">
                <div className="rounded-lg border border-[#e7d7ef] bg-[#f7f0fb] p-4">
                  <h3 className="text-sm font-bold text-[var(--hh-purple-dark)]">Confidential sickness records</h3>
                  <p className="mt-1 text-sm leading-6 text-[#66736d]">These records are treated as confidential clinical information and should require elevated access when viewed later.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {CONFIDENTIAL_CONDITIONS.map((condition) => {
                    const isPresent = conditionValues?.[condition.code]?.status === "yes";
                    return (
                    <div key={condition.code} className="rounded-lg border border-[var(--hh-border)] bg-white p-3">
                      <div className="text-sm font-bold text-[var(--hh-text)]">{condition.label}</div>
                      <div className="mt-3 flex overflow-hidden rounded-lg border border-[var(--hh-border)]">
                        <label className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 border-r border-[var(--hh-border)] text-sm font-bold has-[:checked]:bg-[var(--hh-green-light)] has-[:checked]:text-[var(--hh-green-dark)]">
                          <input className="sr-only" type="radio" value="yes" {...form.register(`conditions.${condition.code}.status`)} />
                          Yes
                        </label>
                        <label className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 text-sm font-bold has-[:checked]:bg-slate-100 has-[:checked]:text-slate-700">
                          <input
                            className="sr-only"
                            type="radio"
                            value="no"
                            {...form.register(`conditions.${condition.code}.status`, {
                              onChange: () => form.setValue(`conditions.${condition.code}.note`, "")
                            })}
                          />
                          No
                        </label>
                      </div>
                      {isPresent && (
                        <label className="mt-3 block">
                          <span className="hh-label">Confidential note</span>
                          <Textarea
                            className="min-h-20"
                            placeholder={`Add ${condition.label.toLowerCase()} details, history, status, or relevant clinical context`}
                            {...form.register(`conditions.${condition.code}.note`)}
                          />
                        </label>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={cn(activeStep.id === "review" ? "block" : "hidden")}>
              <div className="rounded-lg border border-dashed border-[var(--hh-border)] bg-[#f7faf8] p-5">
                <h3 className="text-base font-bold">Ready to save</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736d]">
                  Use Back to review each section. The system will generate the patient code automatically using the next Harmony sequence, current year, and the last 6 digits of the primary phone number.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="secondary" onClick={() => setActiveIndex((value) => Math.max(0, value - 1))} disabled={isFirst}>
            <ChevronLeft size={17} /> Back
          </Button>
          {isLast ? (
            <LoadingButton type="submit" variant="success" loading={saving} loadingText="Saving patient...">
              Create patient
            </LoadingButton>
          ) : (
            <Button type="button" onClick={continueToNextStep}>
              Continue <ChevronRight size={17} />
            </Button>
          )}
        </div>
      </section>
    </form>
  );
}
