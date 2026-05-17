import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { hours?: number; review_note?: string };
  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/access-requests/${id}/approve/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      hours: body.hours || 4,
      review_note: (body.review_note || "").trim()
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json({ success: false, error: errorText.slice(0, 180) }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
