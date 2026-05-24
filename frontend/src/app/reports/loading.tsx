import { HarmonyCardSkeleton, HarmonyTableSkeleton } from "@/components/harmony-loading";

export default function ReportsLoading() {
  return (
    <div className="grid gap-5">
      <HarmonyCardSkeleton rows={3} />
      <HarmonyTableSkeleton columns={4} rows={6} />
    </div>
  );
}
