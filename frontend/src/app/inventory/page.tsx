import { Package, RefreshCw, TriangleAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";

const inventoryCards = [
  ["Stock items", "Remedies, supplies, units, and active stock counts.", Package],
  ["Reorder alerts", "Low-stock warnings and reorder workflow.", TriangleAlert],
  ["Stock movement", "Receive, dispense, adjust, and audit item movement.", RefreshCw]
] as const;

export default function InventoryPage() {
  return (
    <AppShell title="Inventory">
      <section className="grid gap-4 lg:grid-cols-3">
        {inventoryCards.map(([title, description, Icon]) => (
          <div key={title} className="hh-panel p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f5edfa] text-[var(--hh-purple)]">
              <Icon size={22} />
            </div>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">{description}</p>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
