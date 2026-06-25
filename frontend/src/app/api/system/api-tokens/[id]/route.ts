import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const response = await apiFetchWithAuth(`/system/api-tokens/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, detail: errData.detail || "Failed to update API token." },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, detail: err.message || "Invalid request body." },
      { status: 400 }
    );
  }
}
