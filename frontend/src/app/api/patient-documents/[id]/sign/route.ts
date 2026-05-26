import { NextResponse } from "next/server";

import { apiFetchWithAuth } from "@/lib/api-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await apiFetchWithAuth(`/patient-documents/${encodeURIComponent(id)}/sign/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(await request.json().catch(() => ({})))
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
