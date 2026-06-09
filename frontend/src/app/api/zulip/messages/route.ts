import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const channel = searchParams.get("channel");
  const topic = searchParams.get("topic");
  const limit = searchParams.get("limit") || "50";

  if (!channel || !topic) {
    return NextResponse.json(
      { detail: "channel and topic are required parameters." },
      { status: 400 }
    );
  }

  const queryParams = new URLSearchParams();
  queryParams.set("channel", channel);
  queryParams.set("topic", topic);
  queryParams.set("limit", limit);

  const response = await apiFetchWithAuth(`/zulip/messages/?${queryParams.toString()}`);
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
