"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";

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

  if (!response.ok) redirect("/administration/settings?error=email_save_failed");
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

  if (!response.ok) redirect("/administration/settings?error=email_test_failed");
  redirect("/administration/settings?tested=email");
}
