"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

function rowsFromForm(formData: FormData, prefix: string, fields: string[]) {
  const values = fields.map((field) => formData.getAll(`${prefix}_${field}`).map((value) => String(value || "").trim()));
  const maxRows = Math.max(...values.map((fieldValues) => fieldValues.length), 0);
  const rows: Record<string, string>[] = [];

  for (let index = 0; index < maxRows; index += 1) {
    const row: Record<string, string> = {};
    fields.forEach((field, fieldIndex) => {
      row[field] = values[fieldIndex][index] || "";
    });
    if (Object.values(row).some(Boolean)) rows.push(row);
  }

  return rows;
}

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("harmony_access")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function updateClinicianProfile(formData: FormData) {
  const body = {
    full_names: String(formData.get("full_names") || ""),
    professional_title: String(formData.get("professional_title") || ""),
    display_name: String(formData.get("display_name") || ""),
    professional_email: String(formData.get("professional_email") || ""),
    professional_phone: String(formData.get("professional_phone") || ""),
    whatsapp_number: String(formData.get("whatsapp_number") || ""),
    telegram_number: String(formData.get("telegram_number") || ""),
    linkedin_url: String(formData.get("linkedin_url") || ""),
    facebook_url: String(formData.get("facebook_url") || ""),
    portfolio_url: String(formData.get("portfolio_url") || ""),
    bio: String(formData.get("bio") || ""),
    clinical_interests: String(formData.get("clinical_interests") || ""),
    education: rowsFromForm(formData, "education", ["qualification", "institution", "start_year", "end_year", "notes"]),
    career_details: rowsFromForm(formData, "career", ["role", "organization", "start_year", "end_year", "responsibilities"]),
    awards_certifications: rowsFromForm(formData, "award", ["title", "issuer", "year", "expiry", "notes"]),
    affiliations: rowsFromForm(formData, "affiliation", ["organization", "role", "start_year", "status", "notes"]),
  };

  const response = await fetch(`${API_BASE_URL}/users/me/clinician-profile/`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });

  revalidatePath("/account");
  if (!response.ok) {
    redirect("/account?error=profile_save_failed");
  }
  redirect("/account?saved=profile");
}
