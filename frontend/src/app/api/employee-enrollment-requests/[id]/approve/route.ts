import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/employee-enrollment-requests/${id}/approve/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(await request.json().catch(() => ({})))
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ success: false, error: data.detail || "Could not approve request." }, { status: response.status });
  }

  return NextResponse.json({ success: true, data });
}
