import { NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; symptomId: string }> }
) {
  const { id, symptomId } = await params;
  const response = await apiFetchWithAuth(`/visits/${id}/resolve-symptom/${symptomId}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  if (!response.ok) {
    return NextResponse.json(
      { success: false, detail: "Could not resolve symptom." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({ success: true, data });
}
