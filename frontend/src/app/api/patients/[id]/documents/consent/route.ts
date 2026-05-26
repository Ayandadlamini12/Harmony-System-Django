import { NextResponse } from "next/server";

import { apiFetchWithAuth } from "@/lib/api-auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await apiFetchWithAuth(`/patients/${encodeURIComponent(id)}/documents/consent/`, { method: "POST" });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
