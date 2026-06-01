"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";

async function responseDetail(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.detail === "string") return data.detail;
  } catch {
    // Fall through to the generic message below.
  }
  return "The email service returned an unexpected error.";
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}

export async function updateSystemEmailSettings(formData: FormData) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) redirect("/login");

  const payload = {
    is_enabled: formData.get("is_enabled") === "on",
    provider: String(formData.get("provider") || "brevo_api"),
    brevo_api_key: String(formData.get("brevo_api_key") || ""),
    smtp_host: String(formData.get("smtp_host") || ""),
    smtp_port: Number(formData.get("smtp_port") || 587),
    encryption: String(formData.get("encryption") || "starttls"),
    username: String(formData.get("username") || ""),
    password: String(formData.get("password") || ""),
    from_email: String(formData.get("from_email") || ""),
    from_name: String(formData.get("from_name") || ""),
    reply_to_email: String(formData.get("reply_to_email") || ""),
    reply_to_name: String(formData.get("reply_to_name") || "")
  };

  const response = await fetch(`${API_BASE_URL}/system/email-settings/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = encodeURIComponent(await responseDetail(response));
    redirect(`/administration/settings?error=email_save_failed&detail=${detail}`);
  }
  redirect("/administration/settings?saved=email");
}

export async function sendSystemEmailTest(formData: FormData) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) redirect("/login");

  const response = await fetch(`${API_BASE_URL}/system/email-settings/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ recipient: String(formData.get("recipient") || "") })
  });

  if (!response.ok) {
    const detail = encodeURIComponent(await responseDetail(response));
    redirect(`/administration/settings?error=email_test_failed&detail=${detail}`);
  }
  redirect("/administration/settings?tested=email");
}
