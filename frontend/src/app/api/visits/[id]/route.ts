import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL } from "@/lib/api";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("sessionid");
    const csrfCookie = cookieStore.get("csrftoken");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (sessionCookie) {
      headers["Cookie"] = `sessionid=${sessionCookie.value}; csrftoken=${csrfCookie?.value || ""}`;
    }
    if (csrfCookie) {
      headers["X-CSRFToken"] = csrfCookie.value;
    }

    const res = await fetch(`${API_BASE_URL}/api/visits/${id}/`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });

    const data = res.status !== 204 ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      return NextResponse.json(data || { detail: "Failed to update visit." }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating visit:", error);
    return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
  }
}
