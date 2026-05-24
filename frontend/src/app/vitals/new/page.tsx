import { HeartPulse } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function AddVitalsPage() {
  return (
    <AppShell title="Add vitals">
      <section className="hh-panel p-5">
        <div className="flex items-center gap-3">
          <HeartPulse className="text-[var(--hh-purple)]" size={22} />
          <h2 className="font-bold">Add Vitals</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
          Future patient vitals entry screen. For now vitals can still be captured inside the visit workflow, and this route is ready for the dedicated vitals form.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/visits/new">Open visit form</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/patients">Find patient</Link>
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
