"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, FileText, IdCard, LockKeyhole, MapPin, Phone, Users, ChevronLeft, ChevronRight, Plus, Building, Layers, Percent, Mail, Globe, CreditCard, Building2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormStepWheel } from "@/components/form-step-wheel";
import { FormSectionHeader } from "@/components/form-section-header";
import { LoadingButton } from "@/components/harmony-loading";
import { countryCodeOptions, resolveCountryFromDialCode } from "@/components/phone-number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import { showActionError } from "@/lib/action-error";
import { cn } from "@/lib/utils";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationships";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogClose } from "@/components/ui/dialog";


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
  whatsapp_number: z.string().trim().optional(),
  telegram_username: z.string().trim().optional(),
  preferred_notification_channel: z.enum(["", "email", "whatsapp", "telegram"]).optional(),
  notification_consent: z.boolean().default(false),
  region: z.string().trim(),
  town_or_locality: z.string().trim(),
  village: z.string().trim(),
  next_of_kin_full_name: z.string().trim(),
  next_of_kin_phone: optionalPhoneSchema,
  next_of_kin_email: z.string().trim().email("Use a valid email").or(z.literal("")),
  next_of_kin_relationship: z.string().trim(),
  next_of_kin_relationship_other: z.string().trim(),
  has_medical_aid: z.boolean().default(false),
  medical_aid_company: z.string().optional().nullable(),
  medical_aid_membership_ownership: z.enum(["self", "other"]).default("self"),
  medical_aid_owner_full_name: z.string().trim().optional(),
  medical_aid_owner_national_id: z.string().trim().optional(),
  medical_aid_owner_relationship: z.string().trim().optional(),
  medical_aid_id_number: z.string().trim().optional(),
}).superRefine((val, ctx) => {
  if (val.has_medical_aid) {
    if (!val.medical_aid_company) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Medical aid company is required",
        path: ["medical_aid_company"],
      });
    }
    if (!val.medical_aid_id_number || val.medical_aid_id_number.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Medical aid membership/ID number is required",
        path: ["medical_aid_id_number"],
      });
    }
    if (val.medical_aid_membership_ownership === "other") {
      if (!val.medical_aid_owner_full_name || val.medical_aid_owner_full_name.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Owner full name is required when ownership is Other",
          path: ["medical_aid_owner_full_name"],
        });
      }
      if (!val.medical_aid_owner_national_id || val.medical_aid_owner_national_id.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Owner National ID is required when ownership is Other",
          path: ["medical_aid_owner_national_id"],
        });
      }
      if (!val.medical_aid_owner_relationship || val.medical_aid_owner_relationship.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Owner relationship is required when ownership is Other",
          path: ["medical_aid_owner_relationship"],
        });
      }
    }
  }
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
  const [partnerCompanies, setPartnerCompanies] = useState<{ id: number; name: string }[]>([]);
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyEmail, setNewCompanyEmail] = useState("");
  const [newCompanyPhone, setNewCompanyPhone] = useState("");
  const [newCompanyTaxNumber, setNewCompanyTaxNumber] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");
  const [newCompanyAddress, setNewCompanyAddress] = useState("");
  const [newCompanyBankName, setNewCompanyBankName] = useState("");
  const [newCompanyAccountHolder, setNewCompanyAccountHolder] = useState("");
  const [newCompanyAccountNumber, setNewCompanyAccountNumber] = useState("");
  const [newCompanyBranchCode, setNewCompanyBranchCode] = useState("");
  const [inlineFieldErrors, setInlineFieldErrors] = useState<Record<string, string[]>>({});
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const form = useForm<PatientRegistrationValues>({
    resolver: zodResolver(patientRegistrationSchema) as any,
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
      whatsapp_number: "",
      telegram_username: "",
      preferred_notification_channel: "",
      notification_consent: false,
      region: "",
      town_or_locality: "",
      village: "",
      next_of_kin_full_name: "",
      next_of_kin_phone: { country_code: "+268", number: "" },
      next_of_kin_email: "",
      next_of_kin_relationship: "",
      next_of_kin_relationship_other: "",
      has_medical_aid: false,
      medical_aid_company: "",
      medical_aid_membership_ownership: "self",
      medical_aid_owner_full_name: "",
      medical_aid_owner_national_id: "",
      medical_aid_owner_relationship: "",
      medical_aid_id_number: "",
    }
  });

  const primaryDialCode = form.watch("primary_phone.country_code");
  const selectedRegion = form.watch("region");
  const relationship = form.watch("next_of_kin_relationship");
  const hasMedicalAid = form.watch("has_medical_aid");
  const medicalAidOwnership = form.watch("medical_aid_membership_ownership");
  const selectedCountry = useMemo(() => resolveCountryFromDialCode(primaryDialCode || "+268"), [primaryDialCode]);
  const selectedRegionIsoCode = regions.find((region) => region.name === selectedRegion)?.isoCode || "";

  // Watch fields for dynamic preferred channel constraints
  const watchWhatsappNumber = form.watch("whatsapp_number");
  const watchTelegramUsername = form.watch("telegram_username");
  const watchEmail = form.watch("email");
  const preferredChannelVal = form.watch("preferred_notification_channel");

  const isEmailSelectable = !!watchEmail?.trim();
  const isWhatsappSelectable = !!watchWhatsappNumber?.trim();
  const isTelegramSelectable = !!watchTelegramUsername?.trim();

  useEffect(() => {
    if (preferredChannelVal === "email" && !isEmailSelectable) {
      form.setValue("preferred_notification_channel", isWhatsappSelectable ? "whatsapp" : isTelegramSelectable ? "telegram" : "");
    } else if (preferredChannelVal === "whatsapp" && !isWhatsappSelectable) {
      form.setValue("preferred_notification_channel", isEmailSelectable ? "email" : isTelegramSelectable ? "telegram" : "");
    } else if (preferredChannelVal === "telegram" && !isTelegramSelectable) {
      form.setValue("preferred_notification_channel", isEmailSelectable ? "email" : isWhatsappSelectable ? "whatsapp" : "");
    }
  }, [watchEmail, watchWhatsappNumber, watchTelegramUsername, preferredChannelVal, isEmailSelectable, isWhatsappSelectable, isTelegramSelectable, form]);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const response = await fetch("/api/partner-companies/?category=medical_aid");
        if (response.ok) {
          const data = await response.json();
          const results = Array.isArray(data) ? data : (data?.results || []);
          setPartnerCompanies(results);
        }
      } catch (err) {
        console.error("Failed to load medical aid companies", err);
      }
    }
    loadCompanies();
  }, []);

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
      icon: IdCard,
      tone: "identity" as const,
      fields: ["first_name", "last_name", "national_id", "date_of_birth", "gender", "marital_status", "occupation", "allergies", "smoking_status", "smoking_details", "smoking_years", "alcohol_status", "alcohol_details"] as const
    },
    {
      id: "contact",
      title: "Contact and location",
      description: "Country code, phones, email, region, locality, and village.",
      icon: Phone,
      tone: "contact" as const,
      fields: ["primary_phone", "secondary_phone", "email", "whatsapp_number", "telegram_username", "preferred_notification_channel", "notification_consent", "region", "town_or_locality", "village"] as const
    },
    {
      id: "next-of-kin",
      title: "Next of kin",
      description: "Emergency contact and relationship details.",
      icon: Users,
      tone: "contact" as const,
      fields: ["next_of_kin_full_name", "next_of_kin_phone", "next_of_kin_email", "next_of_kin_relationship", "next_of_kin_relationship_other"] as const
    },
    {
      id: "medical-aid",
      title: "Medical aid",
      description: "Medical aid insurance and policy details.",
      icon: ClipboardList,
      tone: "identity" as const,
      fields: ["has_medical_aid", "medical_aid_company", "medical_aid_membership_ownership", "medical_aid_owner_full_name", "medical_aid_owner_national_id", "medical_aid_owner_relationship", "medical_aid_id_number"] as const
    },
    {
      id: "review",
      title: "Review and save",
      description: "Confirm the intake details before creating the patient record.",
      icon: FileText,
      tone: "notes" as const,
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
      whatsapp_number: text(values.whatsapp_number),
      telegram_username: text(values.telegram_username),
      preferred_notification_channel: values.preferred_notification_channel || null,
      notification_consent: values.notification_consent || false,
      next_of_kin_full_name: text(values.next_of_kin_full_name),
      next_of_kin_phone: phoneValue(values.next_of_kin_phone),
      next_of_kin_email: text(values.next_of_kin_email),
      next_of_kin_relationship: text(values.next_of_kin_relationship),
      next_of_kin_relationship_other: text(values.next_of_kin_relationship_other),
      region: text(values.region),
      town_or_locality: text(values.town_or_locality),
      village: text(values.village),
      has_medical_aid: values.has_medical_aid,
      medical_aid_company: values.has_medical_aid && values.medical_aid_company ? Number(values.medical_aid_company) : null,
      medical_aid_membership_ownership: values.has_medical_aid ? values.medical_aid_membership_ownership : "self",
      medical_aid_owner_full_name: values.has_medical_aid && values.medical_aid_membership_ownership === "other" ? text(values.medical_aid_owner_full_name) : "",
      medical_aid_owner_national_id: values.has_medical_aid && values.medical_aid_membership_ownership === "other" ? text(values.medical_aid_owner_national_id) : "",
      medical_aid_owner_relationship: values.has_medical_aid && values.medical_aid_membership_ownership === "other" ? text(values.medical_aid_owner_relationship) : "",
      medical_aid_id_number: values.has_medical_aid ? text(values.medical_aid_id_number) : ""
    };

    try {
      const response = await fetch("/api/patients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showActionError({
          title: "Patient could not be created",
          message: data.detail || "The patient record could not be saved."
        });
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
        <div className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border)] bg-[#fbfdfc] p-4">
            <FormSectionHeader
              icon={activeStep.icon}
              title={activeStep.title}
              description={activeStep.description}
              eyebrow={`Step ${activeIndex + 1} of ${steps.length}`}
              tone={activeStep.tone}
            />
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
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg border border-[#d5e3da] bg-[#f7fbf8] px-3 py-2 text-sm font-bold text-[#24302b]">
                  <Phone size={17} className="text-[var(--hh-purple)]" />
                  Contact details
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-[#cce4d1] bg-[#f2fbf4] px-3 py-2 text-sm font-bold text-[#24302b]">
                  <MapPin size={17} className="text-[#2f7d3b]" />
                  Location details
                </div>
              </div>
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
                  <Label>Secondary phone (optional)</Label>
                  <div className="grid grid-cols-[92px_minmax(10rem,1fr)] gap-2 max-[420px]:grid-cols-1">
                    <input className="hh-input" list="secondary-phone-codes" {...form.register("secondary_phone.country_code")} />
                    <Input inputMode="tel" placeholder="7600 0000" {...form.register("secondary_phone.number")} />
                  </div>
                  <FieldError message={errors.secondary_phone?.country_code?.message || errors.secondary_phone?.number?.message} />
                </label>
                <label className={fieldClass}><Label>Email</Label><Input type="email" {...form.register("email")} /><FieldError message={errors.email?.message} /></label>

                {/* Patient Notification contact and preferences fields */}
                <label className={fieldClass}>
                  <Label>WhatsApp number</Label>
                  <Input type="tel" placeholder="+26876000000" {...form.register("whatsapp_number")} />
                  <FieldError message={errors.whatsapp_number?.message} />
                </label>
                <label className={fieldClass}>
                  <Label>Telegram username</Label>
                  <Input placeholder="@username" {...form.register("telegram_username")} />
                  <FieldError message={errors.telegram_username?.message} />
                </label>
                <label className={fieldClass}>
                  <Label>Preferred notification channel</Label>
                  <Select {...form.register("preferred_notification_channel")}>
                    <option value="">Select preferred channel</option>
                    <option value="email" disabled={!isEmailSelectable}>
                      Email {!isEmailSelectable ? "(Requires value)" : ""}
                    </option>
                    <option value="whatsapp" disabled={!isWhatsappSelectable}>
                      WhatsApp {!isWhatsappSelectable ? "(Requires value)" : ""}
                    </option>
                    <option value="telegram" disabled={!isTelegramSelectable}>
                      Telegram {!isTelegramSelectable ? "(Requires value)" : ""}
                    </option>
                  </Select>
                  <FieldError message={errors.preferred_notification_channel?.message} />
                </label>

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

                <div className="col-span-full border-t border-[var(--hh-border)] pt-5 mt-4 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--hh-purple)] focus:ring-[var(--hh-purple)]"
                      {...form.register("notification_consent")}
                    />
                    <div className="grid gap-0.5">
                      <span className="text-sm font-bold text-slate-800">
                        Notification Consent
                      </span>
                      <span className="text-xs text-[#66736d] leading-normal">
                        I consent to receiving appointment-related reminders and administrative communication through the contact channels I provide.
                      </span>
                    </div>
                  </label>
                </div>
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

            <div className={cn(activeStep.id === "medical-aid" ? "block" : "hidden")}>
              <div className="grid gap-6">
                {/* Do you have medical aid Toggle */}
                <div className={fieldClass}>
                  <Label className="text-sm font-bold text-[var(--hh-text)]">Do you have medical aid?</Label>
                  <div className="flex gap-4 mt-2">
                    <button
                      type="button"
                      className={cn(
                        "flex-1 min-h-12 rounded-lg border text-sm font-bold transition-all duration-200 shadow-sm",
                        hasMedicalAid
                          ? "bg-[var(--hh-green-light)] border-[#a3d4b2] text-[var(--hh-green-dark)] ring-2 ring-[var(--hh-green-light)]"
                          : "bg-white border-[var(--hh-border)] text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => form.setValue("has_medical_aid", true)}
                    >
                      Yes, I have medical aid
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex-1 min-h-12 rounded-lg border text-sm font-bold transition-all duration-200 shadow-sm",
                        !hasMedicalAid
                          ? "bg-slate-100 border-slate-300 text-slate-800 ring-2 ring-slate-100"
                          : "bg-white border-[var(--hh-border)] text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        form.setValue("has_medical_aid", false);
                        form.setValue("medical_aid_company", "");
                        form.setValue("medical_aid_id_number", "");
                        form.setValue("medical_aid_membership_ownership", "self");
                      }}
                    >
                      No, I do not have medical aid
                    </button>
                  </div>
                </div>

                {hasMedicalAid && (
                  <div className="grid gap-5 rounded-lg border border-[var(--hh-border)] bg-[#fdfdfd] p-5 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className={twoColumn}>
                      {/* Organization Dropdown with inline Add Company button */}
                      <div className={fieldClass}>
                        <div className="flex items-center justify-between">
                          <Label>Medical Aid Company</Label>
                          <button
                            type="button"
                            onClick={() => setIsAddingCompany(true)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--hh-purple)] hover:underline"
                          >
                            <Plus size={13} /> Add new company
                          </button>
                        </div>
                        <Select {...form.register("medical_aid_company")}>
                          <option value="">Select medical aid company</option>
                          {partnerCompanies.map((company) => (
                            <option key={company.id} value={String(company.id)}>
                              {company.name}
                            </option>
                          ))}
                        </Select>
                        <FieldError message={errors.medical_aid_company?.message} />
                      </div>

                      {/* Membership ID */}
                      <div className={fieldClass}>
                        <Label>Membership ID Number</Label>
                        <Input placeholder="e.g. MED-839210-93" {...form.register("medical_aid_id_number")} />
                        <FieldError message={errors.medical_aid_id_number?.message} />
                      </div>
                    </div>

                    <div className={twoColumn}>
                      {/* Membership Ownership */}
                      <div className={fieldClass}>
                        <Label>Membership Ownership</Label>
                        <Select {...form.register("medical_aid_membership_ownership")}>
                          <option value="self">Self (Patient is the principal member)</option>
                          <option value="other">Other (Dependent / Other principal member)</option>
                        </Select>
                        <FieldError message={errors.medical_aid_membership_ownership?.message} />
                      </div>
                    </div>

                    {medicalAidOwnership === "other" && (
                      <div className="grid gap-4 border-t border-[var(--hh-border)] pt-4 mt-2 animate-in fade-in slide-in-from-top-3 duration-200">
                        <h4 className="text-sm font-bold text-slate-800">Principal Member Details</h4>
                        <div className={threeColumn}>
                          <div className={fieldClass}>
                            <Label>Full Names</Label>
                            <Input placeholder="John Doe" {...form.register("medical_aid_owner_full_name")} />
                            <FieldError message={errors.medical_aid_owner_full_name?.message} />
                          </div>
                          <div className={fieldClass}>
                            <Label>National / Passport ID</Label>
                            <Input placeholder="ID or Passport Number" {...form.register("medical_aid_owner_national_id")} />
                            <FieldError message={errors.medical_aid_owner_national_id?.message} />
                          </div>
                          <div className={fieldClass}>
                            <Label>Relationship</Label>
                            <Input placeholder="e.g. Spouse, Parent, Guardian" {...form.register("medical_aid_owner_relationship")} />
                            <FieldError message={errors.medical_aid_owner_relationship?.message} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Inline Dialog for Company Creation */}
              <Dialog open={isAddingCompany} onOpenChange={setIsAddingCompany}>
                <DialogContent className="w-[min(94vw,620px)] p-0 overflow-hidden">
                  <div className="bg-[#fcfafc] border-b border-[var(--hh-border)] px-6 py-4 flex items-start gap-4">
                    <div className="rounded-xl bg-[#f4eef5] p-3 text-[var(--hh-purple)] shrink-0">
                      <Building size={24} />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-bold text-[#3f1d58]">Register Partner Company</DialogTitle>
                      <DialogDescription className="text-xs text-[#66736d] mt-0.5">
                        Create a directory file containing legal, financial, and contact identifiers for this medical aid company.
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="grid gap-4 p-6 max-h-[60vh] overflow-y-auto">
                    {/* Name */}
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-[#3f1d58]">
                        Company Legal Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        className={`hh-input h-10 text-sm ${inlineFieldErrors.name ? "border-red-500 focus:border-red-500" : ""}`}
                        placeholder="e.g. Swaziland Medisave Ltd"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                      />
                      {inlineFieldErrors.name && (
                        <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                          {inlineFieldErrors.name.join(" ")}
                        </span>
                      )}
                    </div>

                    {/* Category and Tax Number Row */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <Layers size={12} /> Category
                        </Label>
                        <Input className="hh-input h-10 text-sm" value="Medical Aid" disabled readOnly />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <Percent size={12} /> Tax Number
                        </Label>
                        <Input
                          className={`hh-input h-10 text-sm ${inlineFieldErrors.tax_number ? "border-red-500 focus:border-red-500" : ""}`}
                          placeholder="e.g. TIN-100-244-11"
                          value={newCompanyTaxNumber}
                          onChange={(e) => setNewCompanyTaxNumber(e.target.value)}
                        />
                        {inlineFieldErrors.tax_number && (
                          <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                            {inlineFieldErrors.tax_number.join(" ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Contacts Row */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <Phone size={12} /> Phone Number
                        </Label>
                        <Input
                          className={`hh-input h-10 text-sm ${inlineFieldErrors.phone_number ? "border-red-500 focus:border-red-500" : ""}`}
                          placeholder="e.g. +268 2404 0000"
                          value={newCompanyPhone}
                          onChange={(e) => setNewCompanyPhone(e.target.value)}
                        />
                        {inlineFieldErrors.phone_number && (
                          <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                            {inlineFieldErrors.phone_number.join(" ")}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <Mail size={12} /> Email Address
                        </Label>
                        <Input
                          type="email"
                          className={`hh-input h-10 text-sm ${inlineFieldErrors.email ? "border-red-500 focus:border-red-500" : ""}`}
                          placeholder="e.g. support@medisave.sz"
                          value={newCompanyEmail}
                          onChange={(e) => setNewCompanyEmail(e.target.value)}
                        />
                        {inlineFieldErrors.email && (
                          <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                            {inlineFieldErrors.email.join(" ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Website */}
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                        <Globe size={12} /> Website URL
                      </Label>
                      <Input
                        className={`hh-input h-10 text-sm ${inlineFieldErrors.website ? "border-red-500 focus:border-red-500" : ""}`}
                        placeholder="e.g. www.medisave.sz"
                        value={newCompanyWebsite}
                        onChange={(e) => setNewCompanyWebsite(e.target.value)}
                      />
                      {inlineFieldErrors.website && (
                        <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                          {inlineFieldErrors.website.join(" ")}
                        </span>
                      )}
                    </div>

                    {/* Address */}
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                        <MapPin size={12} /> Physical Address
                      </Label>
                      <Textarea
                        className={`h-10 min-h-[40px] text-sm border-[var(--hh-border)] focus:border-[var(--hh-purple)] focus:ring-1 focus:ring-[var(--hh-purple)] leading-normal resize-none py-2 ${
                          inlineFieldErrors.address ? "border-red-500 focus:border-red-500" : ""
                        }`}
                        placeholder="e.g. Suite 4, Plot 12, Gables Mbabane"
                        value={newCompanyAddress}
                        onChange={(e) => setNewCompanyAddress(e.target.value)}
                      />
                      {inlineFieldErrors.address && (
                        <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                          {inlineFieldErrors.address.join(" ")}
                        </span>
                      )}
                    </div>

                    {/* Banking Section Divider */}
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-[var(--hh-border)]" />
                      </div>
                      <div className="relative flex justify-start">
                        <span className="bg-white pr-3 text-[11px] font-bold uppercase tracking-wider text-[var(--hh-purple)]">
                          Banking Details (Optional)
                        </span>
                      </div>
                    </div>

                    {/* Bank Name and Account Holder */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <CreditCard size={12} /> Bank Name
                        </Label>
                        <Select
                          value={newCompanyBankName}
                          onChange={(e) => setNewCompanyBankName(e.target.value)}
                          className={`h-10 text-sm bg-white ${inlineFieldErrors.bank_name ? "border-red-500 focus:border-red-500" : ""}`}
                        >
                          <option value="">Select a bank...</option>
                          <option value="fnb">First National Bank (FNB)</option>
                          <option value="standard_bank">Standard Bank</option>
                          <option value="nedbank">Nedbank</option>
                          <option value="eswatini_bank">Eswatini Bank</option>
                          <option value="eswatini_building_society">Eswatini Building Society</option>
                        </Select>
                        {inlineFieldErrors.bank_name && (
                          <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                            {inlineFieldErrors.bank_name.join(" ")}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <Building2 size={12} /> Account Holder Name
                        </Label>
                        <Input
                          className={`hh-input h-10 text-sm ${inlineFieldErrors.account_holder ? "border-red-500 focus:border-red-500" : ""}`}
                          placeholder="e.g. Swaziland Medisave Ltd"
                          value={newCompanyAccountHolder}
                          onChange={(e) => setNewCompanyAccountHolder(e.target.value)}
                        />
                        {inlineFieldErrors.account_holder && (
                          <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                            {inlineFieldErrors.account_holder.join(" ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Account Number and Branch Code */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <CreditCard size={12} /> Account Number
                        </Label>
                        <Input
                          className={`hh-input h-10 text-sm ${inlineFieldErrors.account_number ? "border-red-500 focus:border-red-500" : ""}`}
                          placeholder="e.g. 62041122334"
                          value={newCompanyAccountNumber}
                          onChange={(e) => setNewCompanyAccountNumber(e.target.value)}
                        />
                        {inlineFieldErrors.account_number && (
                          <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                            {inlineFieldErrors.account_number.join(" ")}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                          <Layers size={12} /> Branch Code
                        </Label>
                        <Input
                          className={`hh-input h-10 text-sm ${inlineFieldErrors.branch_code ? "border-red-500 focus:border-red-500" : ""}`}
                          placeholder="e.g. 280164"
                          value={newCompanyBranchCode}
                          onChange={(e) => setNewCompanyBranchCode(e.target.value)}
                        />
                        {inlineFieldErrors.branch_code && (
                          <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                            {inlineFieldErrors.branch_code.join(" ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[var(--hh-border)] bg-[#fcfafc] px-6 py-4 flex justify-end gap-3">
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" className="h-10 text-xs font-bold">Cancel</Button>
                    </DialogClose>
                    <LoadingButton
                      type="button"
                      className="h-10 text-xs font-bold"
                      onClick={async () => {
                        if (!newCompanyName.trim()) {
                          toast.error("Company Legal Name is required.");
                          setInlineFieldErrors({ name: ["This field is required."] });
                          return;
                        }
                        setIsSavingCompany(true);
                        setInlineFieldErrors({});

                        let websiteUrl = newCompanyWebsite.trim();
                        if (websiteUrl && !websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
                          websiteUrl = `https://${websiteUrl}`;
                        }

                        try {
                          const response = await fetch("/api/partner-companies/", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              name: newCompanyName.trim(),
                              category: "medical_aid",
                              tax_number: newCompanyTaxNumber.trim(),
                              phone_number: newCompanyPhone.trim(),
                              email: newCompanyEmail.trim(),
                              website: websiteUrl,
                              address: newCompanyAddress.trim(),
                              bank_name: newCompanyBankName || null,
                              account_holder: newCompanyAccountHolder.trim(),
                              account_number: newCompanyAccountNumber.trim(),
                              branch_code: newCompanyBranchCode.trim(),
                            }),
                          });
                          const data = await response.json();
                          if (response.ok) {
                            toast.success(`Partner company '${newCompanyName}' added successfully.`);
                            setPartnerCompanies((prev) => [...prev, data]);
                            form.setValue("medical_aid_company", String(data.id));

                            // Reset state
                            setNewCompanyName("");
                            setNewCompanyEmail("");
                            setNewCompanyPhone("");
                            setNewCompanyTaxNumber("");
                            setNewCompanyWebsite("");
                            setNewCompanyAddress("");
                            setNewCompanyBankName("");
                            setNewCompanyAccountHolder("");
                            setNewCompanyAccountNumber("");
                            setNewCompanyBranchCode("");
                            setInlineFieldErrors({});

                            setIsAddingCompany(false);
                          } else {
                            if (response.status === 400 && typeof data === "object") {
                              setInlineFieldErrors(data);
                              const firstError = Object.values(data)[0];
                              const errorMsg = Array.isArray(firstError) ? firstError[0] : "Please check highlighted fields.";
                              toast.error(errorMsg);
                            } else {
                              toast.error(data.detail || "Failed to save partner company.");
                            }
                          }
                        } catch (err) {
                          toast.error("Failed to add partner company inline.");
                        } finally {
                          setIsSavingCompany(false);
                        }
                      }}
                      loading={isSavingCompany}
                      loadingText="Creating..."
                    >
                      Add Company
                    </LoadingButton>
                  </div>
                </DialogContent>
              </Dialog>
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
