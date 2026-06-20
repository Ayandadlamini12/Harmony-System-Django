"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { API_BASE_URL } from "@/lib/api";
import type { PractitionerAvailability } from "@/types/scheduling";

async function authHeaders() {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) redirect("/login");
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function responseDetail(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
    if (typeof data?.error === "string") return data.error;
    if (data && typeof data === "object") {
      return Object.entries(data)
        .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
        .join(" ");
    }
  } catch {
    // Fall through to generic message.
  }
  return "Availability settings could not be saved.";
}

export async function getPractitionerAvailabilities(practitionerId?: string) {
  const headers = await authHeaders();
  const query = practitionerId ? `?practitioner=${encodeURIComponent(practitionerId)}` : "";
  const response = await fetch(`${API_BASE_URL}/practitioner-availabilities/${query}`, {
    headers,
    cache: "no-store",
  });

  if (!response.ok) return [];
  const data = await response.json().catch(() => []);
  return (data.results || data || []) as PractitionerAvailability[];
}

export async function createPractitionerAvailability(formData: FormData) {
  const headers = await authHeaders();
  const payload = availabilityPayload(formData);
  const response = await fetch(`${API_BASE_URL}/practitioner-availabilities/`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    redirect(`/appointments/availability?error=${encodeURIComponent(await responseDetail(response))}`);
  }

  revalidatePath("/appointments/availability");
  redirect(`/appointments/availability?saved=created&practitioner=${payload.practitioner}`);
}

export async function updatePractitionerAvailability(formData: FormData) {
  const headers = await authHeaders();
  const id = String(formData.get("id") || "");
  const payload = availabilityPayload(formData);
  const response = await fetch(`${API_BASE_URL}/practitioner-availabilities/${id}/`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    redirect(`/appointments/availability?error=${encodeURIComponent(await responseDetail(response))}`);
  }

  revalidatePath("/appointments/availability");
  redirect(`/appointments/availability?saved=updated&practitioner=${payload.practitioner}`);
}

export async function deletePractitionerAvailability(formData: FormData) {
  const headers = await authHeaders();
  const id = String(formData.get("id") || "");
  const practitioner = String(formData.get("practitioner") || "");
  const response = await fetch(`${API_BASE_URL}/practitioner-availabilities/${id}/`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    redirect(`/appointments/availability?error=${encodeURIComponent(await responseDetail(response))}`);
  }

  revalidatePath("/appointments/availability");
  redirect(`/appointments/availability?saved=deleted&practitioner=${practitioner}`);
}

function availabilityPayload(formData: FormData) {
  return {
    practitioner: Number(formData.get("practitioner")),
    weekday: Number(formData.get("weekday")),
    start_time: String(formData.get("start_time") || ""),
    end_time: String(formData.get("end_time") || ""),
    effective_from: String(formData.get("effective_from") || ""),
    effective_to: String(formData.get("effective_to") || "") || null,
    location: String(formData.get("location") || ""),
  };
}
