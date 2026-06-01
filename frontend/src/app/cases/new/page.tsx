import { redirect } from "next/navigation";

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ patient?: string; parent?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.patient) query.set("patient", params.patient);
  if (params.parent) query.set("type", "follow_up");

  redirect(`/visits/new${query.toString() ? `?${query.toString()}` : ""}`);
}
