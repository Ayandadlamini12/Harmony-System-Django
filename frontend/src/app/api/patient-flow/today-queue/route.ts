import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function GET(request: Request) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || "";
  const stage = searchParams.get("stage") || "";
  const flowType = searchParams.get("flow_type") || "";

  // Build target backend url
  const backendUrl = new URL(`${API_BASE_URL}/patient-flow/today-queue/`);
  if (date) backendUrl.searchParams.set("date", date);
  if (stage) backendUrl.searchParams.set("stage", stage);
  if (flowType) backendUrl.searchParams.set("flow_type", flowType);

  try {
    const response = await fetch(backendUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Backend queue fetch failed" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to proxy patient-flow today-queue request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
