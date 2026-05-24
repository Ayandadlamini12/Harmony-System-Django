"use client";

import type React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function HarmonySpinner({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex items-center justify-center text-[var(--hh-purple)]", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--hh-green)] opacity-20" />
      <Spinner className="relative size-full" />
    </span>
  );
}

export function LoadingButton({
  loading,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps & { loading?: boolean; loadingText?: string }) {
  return (
    <Button aria-busy={loading || undefined} disabled={disabled || loading} {...props}>
      {loading && <Spinner className="size-4" />}
      {loading ? loadingText || children : children}
    </Button>
  );
}

export function HarmonyPageLoader({ label = "Loading workspace" }: { label?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--hh-soft)] px-5">
      <div className="hh-panel flex w-full max-w-sm flex-col items-center p-8 text-center" role="status" aria-live="polite">
        <img alt="" className="h-16 w-16 rounded-xl object-cover" src="/brand/harmony-icon-sm.webp" />
        <HarmonySpinner className="mt-5 size-8" />
        <p className="mt-4 text-sm font-bold text-[var(--hh-purple-dark)]">{label}</p>
        <Progress className="mt-5" label={label} />
      </div>
    </main>
  );
}

export function HarmonyInlineLoader({ label = "Processing" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#53605a]" role="status" aria-live="polite">
      <Spinner className="text-[var(--hh-purple)]" />
      {label}
    </span>
  );
}

export function HarmonyCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <section className="hh-panel p-5" aria-busy="true">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </section>
  );
}

export function HarmonyTableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="hh-panel overflow-hidden" aria-busy="true">
      <div className="grid gap-3 border-b border-[var(--hh-border)] p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="grid gap-3 border-b border-[var(--hh-border)] p-4 last:border-b-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton key={columnIndex} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function HarmonyFormSkeleton() {
  return (
    <div className="hh-panel grid gap-4 p-5" aria-busy="true">
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
