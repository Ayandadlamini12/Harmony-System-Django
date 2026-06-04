import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const response = await fetch(`${API_BASE_URL}/support-tickets/${id}/`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ success: false, error: errorText.slice(0, 180) }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
