import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || "http://backend:8000/api";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookie = request.cookies.get("harmony_access")?.value;
  const cookieStr = request.headers.get("cookie") || "";

  try {
    const res = await fetch(`${API_BASE_URL}/cases/${id}/resolve/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Authorization: `Bearer ${cookie}` } : {}),
        ...(cookieStr ? { Cookie: cookieStr } : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "backend_unavailable" }, { status: 503 });
  }
}
