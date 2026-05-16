import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return NextResponse.redirect(new URL("/login", APP_BASE_URL), 303);
  }

  const formData = await request.formData();
  const patient = Number(formData.get("patient"));
  const reason = String(formData.get("reason") || "").trim();

  const response = await fetch(`${API_BASE_URL}/access-requests/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ patient, reason })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.redirect(new URL(`/access-requests?error=${encodeURIComponent(errorText.slice(0, 180))}`, APP_BASE_URL), 303);
  }

  return NextResponse.redirect(new URL("/access-requests?created=1", APP_BASE_URL), 303);
}
