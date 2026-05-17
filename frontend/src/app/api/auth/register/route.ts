import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    username?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    password?: string;
    confirm_password?: string;
  };

  const response = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    return NextResponse.json({ success: true });
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

  return NextResponse.json({ success: false, error }, { status: 400 });
}
