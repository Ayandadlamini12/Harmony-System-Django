import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function POST(request: Request) {
  const body = await request.text();
  const callbackSecret =
    request.headers.get("x-harmony-n8n-callback-secret") ||
    request.headers.get("x-harmony-webhook-secret") ||
    "";

  const response = await fetch(`${API_BASE_URL}/webhooks/verify-channel/`, {
    method: "POST",
    headers: {
      "Content-Type": request.headers.get("content-type") || "application/json",
      ...(callbackSecret ? { "X-Harmony-N8N-Callback-Secret": callbackSecret } : {}),
    },
    body,
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable." }, { status: 503 });
  }

  const responseText = await response.text();
  return new Response(responseText, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}
