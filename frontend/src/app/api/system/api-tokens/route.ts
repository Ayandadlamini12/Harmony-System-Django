import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search");
  const status = searchParams.get("status");
  const ordering = searchParams.get("ordering");
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("page_size");
  const createdBy = searchParams.get("created_by");

  const queryParams = new URLSearchParams();
  if (search) queryParams.set("search", search);
  if (status) queryParams.set("status", status);
  if (ordering) queryParams.set("ordering", ordering);
  if (page) queryParams.set("page", page);
  if (pageSize) queryParams.set("page_size", pageSize);
  if (createdBy) queryParams.set("created_by", createdBy);

  const response = await apiFetchWithAuth(`/system/api-tokens/?${queryParams.toString()}`);

  if (!response.ok) {
    return NextResponse.json(
      { success: false, detail: "Failed to fetch API tokens from backend." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await apiFetchWithAuth("/system/api-tokens/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, detail: errData.detail || "Failed to create API token." },
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
