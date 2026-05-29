import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export async function GET(request: Request) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("query") || "";
  const response = await fetch(`${API_BASE_URL}/patients/?search=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ results: [] }, { status: response.status });
  }

  const data = await response.json();
  return NextResponse.json({ results: data.results || [] });
}
