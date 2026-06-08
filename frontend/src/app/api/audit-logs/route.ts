import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const entityType = searchParams.get("entity_type");
  const entityId = searchParams.get("entity_id");
  const page = searchParams.get("page") || "1";

  const queryParams = new URLSearchParams();
  if (entityType) {
    queryParams.set("entity_type", entityType);
  }
  if (entityId) {
    queryParams.set("entity_id", entityId);
  }
  queryParams.set("page", page);

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
