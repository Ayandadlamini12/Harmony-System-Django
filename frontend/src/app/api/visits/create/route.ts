import { NextResponse } from "next/server";

import { apiFetchWithAuth } from "@/lib/api-auth";

function readableError(payload: unknown): string {
  if (!payload) return "The visit could not be saved.";
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload)) return payload.map(readableError).filter(Boolean).join(" ");
  if (typeof payload !== "object") return String(payload);

  const record = payload as Record<string, unknown>;
  if (typeof record.detail === "string") return record.detail;
  if (typeof record.error === "string") return record.error;

  return Object.entries(record)
    .map(([key, value]) => {
      const message = readableError(value);
      return message ? `${key.replaceAll("_", " ")}: ${message}` : "";
    })
    .filter(Boolean)
    .join(" ");
}

export async function POST(request: Request) {
  const body = await request.json();

  const response = await apiFetchWithAuth("/visits/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const rawText = await response.text();
    let parsed: unknown = rawText;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
    return NextResponse.json(
      { success: false, detail: readableError(parsed) || "The visit could not be saved." },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({ success: true, data });
}
