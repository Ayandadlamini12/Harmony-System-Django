import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const formData = await request.formData();
  const old_password = String(formData.get("old_password") || "");
  const new_password = String(formData.get("new_password") || "");

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("harmony_access")?.value;

  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", APP_BASE_URL), 303);
  }

  const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ old_password, new_password }),
  });

  if (response.ok) {
    return NextResponse.redirect(new URL("/account?password=changed", APP_BASE_URL), 303);
  }

  let error = "unknown";
  try {
    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data === "object" && data !== null) {
      const msgs = JSON.stringify(data).toLowerCase();
      if (msgs.includes("wrong password")) error = "wrong";
      else if (msgs.includes("minimum") || msgs.includes("common") || msgs.includes("numeric") || msgs.includes("similar")) error = "weak";
    }
  } catch {
    error = "unknown";
  }

  return NextResponse.redirect(new URL(`/account?password=${error}`, APP_BASE_URL), 303);
}
