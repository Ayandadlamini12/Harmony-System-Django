"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

function optionalText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function phoneValue(formData: FormData, name: "primary_phone" | "secondary_phone" | "next_of_kin_phone") {
  const countryCode = optionalText(formData, `${name}_country_code`).replace(/[^\d+]/g, "");
  const number = optionalText(formData, `${name}_number`).replace(/\D/g, "");
  if (!number) return "";
  return `${countryCode || "+268"}${number}`;
}

export async function createPatient(formData: FormData) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    redirect("/login");
  }

  const childrenCount = optionalText(formData, "children_count");
  const conditions = CONFIDENTIAL_CONDITIONS.map((condition) => ({
    condition_code: condition.code,
    condition_label: condition.label,
    present: optionalText(formData, `condition_${condition.code}`) === "yes",
    is_confidential: true,
    status: "active"
  }));
  const body = {
    first_name: optionalText(formData, "first_name"),
    middle_name: optionalText(formData, "middle_name"),
    last_name: optionalText(formData, "last_name"),
    national_id: optionalText(formData, "national_id") || null,
    email: optionalText(formData, "email"),
    date_of_birth: optionalText(formData, "date_of_birth") || null,
    gender: optionalText(formData, "gender") || "prefer_not_to_say",
    primary_phone: phoneValue(formData, "primary_phone"),
    secondary_phone: phoneValue(formData, "secondary_phone"),
    next_of_kin_full_name: optionalText(formData, "next_of_kin_full_name"),
    next_of_kin_phone: phoneValue(formData, "next_of_kin_phone"),
    next_of_kin_email: optionalText(formData, "next_of_kin_email"),
    next_of_kin_relationship: optionalText(formData, "next_of_kin_relationship"),
    next_of_kin_relationship_other: optionalText(formData, "next_of_kin_relationship_other"),
    region: optionalText(formData, "region"),
    town_or_locality: optionalText(formData, "town_or_locality"),
    village: optionalText(formData, "village"),
    profile: {
      hiv_status: optionalText(formData, "hiv_status") || "undisclosed",
      children_count: childrenCount ? Number(childrenCount) : null,
      past_medical_history: optionalText(formData, "past_medical_history"),
      family_medical_history: optionalText(formData, "family_medical_history"),
      allopathic_medication: optionalText(formData, "allopathic_medication"),
      other_important_information: optionalText(formData, "other_important_information")
    },
    conditions
  };

  const response = await fetch(`${API_BASE_URL}/patients/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    redirect(`/patients/new?error=${encodeURIComponent(errorText.slice(0, 180))}`);
  }

  redirect("/patients");
}
