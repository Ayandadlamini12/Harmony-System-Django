import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entity_type");
  const entityId = searchParams.get("entity_id");
  const page = searchParams.get("page") || "1";

  if (!entityType || !entityId) {
    return NextResponse.json(
      { success: false, detail: "Missing entity_type or entity_id query parameters." },
      { status: 400 }
    );
  }

  const queryParams = new URLSearchParams({
    entity_type: entityType,
    entity_id: entityId,
    page: page,
  });

  const response = await apiFetchWithAuth(`/audit-logs/?${queryParams.toString()}`);

  if (!response.ok) {
    return NextResponse.json(
      { success: false, detail: "Failed to fetch audit logs from backend." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({ success: true, ...data });
}
