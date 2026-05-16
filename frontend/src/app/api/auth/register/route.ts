import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const formData = await request.formData();
  const body = {
    username: String(formData.get("username") || ""),
    email: String(formData.get("email") || ""),
    first_name: String(formData.get("first_name") || ""),
    last_name: String(formData.get("last_name") || ""),
    password: String(formData.get("password") || ""),
    confirm_password: String(formData.get("confirm_password") || ""),
  };

  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return NextResponse.redirect(new URL("/login?registered=1", APP_BASE_URL), 303);
  }

  let error = "unknown";
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data === "object" && data !== null) {
      const msgs = JSON.stringify(data).toLowerCase();
      if (msgs.includes("already exists") || msgs.includes("username")) error = "exists";
      else if (msgs.includes("do not match")) error = "mismatch";
      else if (msgs.includes("password") && (msgs.includes("weak") || msgs.includes("minimum") || msgs.includes("common") || msgs.includes("numeric"))) error = "weak";
    }
  } catch {
    error = "unknown";
  }

  return NextResponse.redirect(new URL(`/register?error=${error}`, APP_BASE_URL), 303);
}
