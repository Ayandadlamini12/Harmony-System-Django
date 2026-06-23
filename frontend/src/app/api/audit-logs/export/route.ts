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

  const queryParams = new URLSearchParams();
  if (source) queryParams.set("source", source);
  if (category) queryParams.set("category", category);
  if (user) queryParams.set("user", user);
  if (action) queryParams.set("action", action);
  if (search) queryParams.set("search", search);
  if (dateFrom) queryParams.set("date_from", dateFrom);
  if (dateTo) queryParams.set("date_to", dateTo);

  const response = await apiFetchWithAuth(`/audit-logs/export/?${queryParams.toString()}`);

  if (!response.ok) {
    let errorDetail = "Failed to export audit logs.";
    try {
      const errorData = await response.json();
      if (errorData?.detail) {
        errorDetail = errorData.detail;
      }
    } catch {
      // Ignore parsing failures
    }
    return NextResponse.json(
      { success: false, detail: errorDetail },
      { status: response.status }
    );
  }

  const contentType = response.headers.get("content-type") || "text/csv";
  const contentDisposition = response.headers.get("content-disposition") || 'attachment; filename="harmony-audit-logs.csv"';

  const body = response.body;

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", contentDisposition);

  return new NextResponse(body, {
    status: 200,
    headers,
  });
}
