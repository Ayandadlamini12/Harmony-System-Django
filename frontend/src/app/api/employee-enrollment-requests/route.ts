import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function POST(request: Request) {
  const webhookSecret = request.headers.get("x-harmony-webhook-secret") || "";
  const body = await request.json().catch(() => ({}));

  const response = await fetch(`${API_BASE_URL}/employee-enrollment-requests/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Harmony-Webhook-Secret": webhookSecret
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
