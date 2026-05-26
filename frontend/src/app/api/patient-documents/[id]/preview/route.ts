import { apiFetchWithAuth } from "@/lib/api-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await apiFetchWithAuth(`/patient-documents/${encodeURIComponent(id)}/preview/`);

  if (!response.ok) {
    return new Response(await response.text().catch(() => "Preview unavailable"), { status: response.status });
  }

  return new Response(await response.text(), {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "text/html; charset=utf-8"
    }
  });
}
