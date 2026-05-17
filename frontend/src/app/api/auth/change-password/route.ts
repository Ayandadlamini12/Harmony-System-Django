import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function POST(request: Request) {
  const body = (await request.json()) as { old_password?: string; new_password?: string };
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("harmony_access")?.value;

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ old_password: body.old_password, new_password: body.new_password }),
  });

  if (response.ok) {
    return NextResponse.json({ success: true });
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

  return NextResponse.json({ success: false, error }, { status: 400 });
}
