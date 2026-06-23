import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const source = searchParams.get("source");
  const category = searchParams.get("category");
  const user = searchParams.get("user");
  const action = searchParams.get("action");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("page_size") || "25";

  const queryParams = new URLSearchParams();
  if (source) queryParams.set("source", source);
  if (category) queryParams.set("category", category);
  if (user) queryParams.set("user", user);
  if (action) queryParams.set("action", action);
  if (search) queryParams.set("search", search);
  if (dateFrom) queryParams.set("date_from", dateFrom);
  if (dateTo) queryParams.set("date_to", dateTo);
  queryParams.set("page", page);
  queryParams.set("page_size", pageSize);

  const response = await apiFetchWithAuth(`/audit-logs/unified/?${queryParams.toString()}`);

  if (!response.ok) {
    return NextResponse.json(
      { success: false, detail: "Failed to fetch unified audit logs from backend." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({ success: true, ...data });
}
