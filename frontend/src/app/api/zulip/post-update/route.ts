import { type NextRequest, NextResponse } from "next/server";
import { apiFetchWithAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const response = await apiFetchWithAuth("/zulip/post-update/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text().catch(() => "");
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json") && text) {
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch (e) {
      // JSON parse failed, proceed to raw text handling
    }
  }

  if (text.includes("<!DOCTYPE html>") || text.includes("<html>")) {
    return NextResponse.json(
      { detail: `HTTP ${response.status} ${response.statusText}: Server-side exception or HTML page returned.` },
      { status: response.status }
    );
  }

  return NextResponse.json(
    { detail: text || `HTTP ${response.status}: ${response.statusText}` },
    { status: response.status }
  );
}
