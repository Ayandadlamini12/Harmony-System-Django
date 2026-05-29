import { HarmonyCardSkeleton } from "@/components/harmony-loading";
import { Skeleton } from "@/components/ui/skeleton";

export default function PatientWorkspaceLoading() {
  return (
    <div className="grid gap-5">
      <section className="hh-panel p-5">
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-40 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
            </div>
          </div>
        </div>
      </section>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-28 shrink-0" />
        ))}
      </div>
      <HarmonyCardSkeleton rows={5} />
      <HarmonyCardSkeleton rows={5} />
      <HarmonyCardSkeleton rows={4} />
    </div>
  );
}
