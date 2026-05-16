import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

function optionalText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function optionalNumber(formData: FormData, key: string) {
  const value = optionalText(formData, key);
  return value ? Number(value) : null;
}

export async function POST(request: Request) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", APP_BASE_URL), 303);
  }

  const formData = await request.formData();
  const body = {
    patient: Number(optionalText(formData, "patient")),
    visit_type: optionalText(formData, "visit_type") || "new_consultation",
    visit_date: optionalText(formData, "visit_date"),
    visit_time: optionalText(formData, "visit_time") || null,
    main_complaint: optionalText(formData, "main_complaint"),
    initial_complaints: optionalText(formData, "initial_complaints"),
    physical_examination: optionalText(formData, "physical_examination"),
    diagnosis: optionalText(formData, "diagnosis"),
    remedy: optionalText(formData, "remedy"),
    reason_for_remedy: optionalText(formData, "reason_for_remedy"),
    dietary_recommendation: optionalText(formData, "dietary_recommendation"),
    lifestyle_recommendation: optionalText(formData, "lifestyle_recommendation"),
    vitals: {
      bp_first_reading: optionalText(formData, "bp_first_reading"),
      bp_second_reading: optionalText(formData, "bp_second_reading"),
      pulse: optionalNumber(formData, "pulse"),
      resp_rate: optionalNumber(formData, "resp_rate"),
      temperature: optionalNumber(formData, "temperature"),
      weight: optionalNumber(formData, "weight"),
      glucose_mmol_l: optionalNumber(formData, "glucose_mmol_l"),
      glucose_context: optionalText(formData, "glucose_context") || "unknown",
      medication_taken_status: optionalText(formData, "medication_taken_status") || "unknown"
    }
  };

  const response = await fetch(`${API_BASE_URL}/visits/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.redirect(new URL(`/visits/new?error=${encodeURIComponent(errorText.slice(0, 180))}`, APP_BASE_URL), 303);
  }

  return NextResponse.redirect(new URL("/visits", APP_BASE_URL), 303);
}
