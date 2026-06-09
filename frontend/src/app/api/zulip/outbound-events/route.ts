import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const queryString = request.nextUrl.search;
  const response = await apiFetchWithAuth(`/zulip/outbound-events/${queryString}`);
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
