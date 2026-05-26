import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const response = await fetch(`${API_BASE_URL}/patient-documents/${encodeURIComponent(id)}/download/`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok || !response.body) {
    return new Response(await response.text().catch(() => "Document unavailable"), { status: response.status });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/pdf",
      "Content-Disposition": response.headers.get("Content-Disposition") || "inline"
    }
  });
}
