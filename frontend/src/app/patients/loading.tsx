import { HarmonyCardSkeleton, HarmonyTableSkeleton } from "@/components/harmony-loading";

export default function PatientsLoading() {
  return (
    <div className="grid gap-5">
      <HarmonyCardSkeleton rows={2} />
      <HarmonyTableSkeleton columns={5} rows={8} />
    </div>
  );
}
