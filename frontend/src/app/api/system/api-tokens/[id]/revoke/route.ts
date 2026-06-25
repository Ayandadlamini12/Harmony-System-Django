import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const response = await apiFetchWithAuth(`/system/api-tokens/${id}/revoke/`, {
    method: "POST"
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    return NextResponse.json(
      { success: false, detail: errData.detail || "Failed to revoke API token." },
      { status: response.status }
    );
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json({ success: true, ...data });
}
