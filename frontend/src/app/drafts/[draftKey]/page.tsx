import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getFormDraft } from "@/lib/api";

export default async function DraftDetailPage({ params }: { params: Promise<{ draftKey: string }> }) {
  const { draftKey } = await params;
  const draft = await getFormDraft(draftKey);
  if (!draft) notFound();

  return (
    <AppShell
      title="Review draft"
      action={<Button asChild variant="secondary"><Link href="/">Back to dashboard</Link></Button>}
    >
      <section className="hh-panel overflow-hidden">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-lg font-bold">{draft.form_type_label || draft.form_type.replaceAll("_", " ")}</h2>
          <p className="mt-1 text-sm text-[#66736d]">
            Stage: {draft.current_stage || "Not set"} · Last saved {new Date(draft.last_saved_at).toLocaleString()}
          </p>
        </div>
        <div className="grid gap-5 p-5">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            This draft storage foundation is active. The next implementation step is to connect each staged form to this draft so the form opens directly at the saved stage.
          </div>
          <pre className="max-h-[520px] overflow-auto rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4 text-xs leading-5">
            {JSON.stringify(draft.payload || {}, null, 2)}
          </pre>
        </div>
      </section>
    </AppShell>
  );
}
