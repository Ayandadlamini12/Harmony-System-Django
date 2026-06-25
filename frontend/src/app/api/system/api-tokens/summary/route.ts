import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const response = await apiFetchWithAuth("/system/api-tokens/summary/");

  if (!response.ok) {
    return NextResponse.json(
      { success: false, detail: "Failed to fetch API tokens summary from backend." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json(data);
}
