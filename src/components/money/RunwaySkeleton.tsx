import { cn } from "@/lib/utils";

import { ToolsCard } from "./ToolsCard";

function Bone({ className }: { className: string }) {
  return <div className={cn("rounded-lg bg-muted motion-safe:animate-pulse", className)} />;
}

/**
 * Server render and first client paint: today's date is only known in the browser, so show a calm
 * placeholder with roughly the same heights as the real page to avoid a jump.
 */
export function RunwaySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">
        Working out your runway…
      </p>

      <div aria-hidden="true" className="space-y-2">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <Bone className="h-3 w-24" />
          <Bone className="mt-3 h-[4.5rem] w-48" />
          <div className="mt-4 flex flex-wrap gap-3">
            <Bone className="h-6 w-56" />
            <Bone className="h-7 w-36 rounded-full" />
          </div>
          <Bone className="mt-4 h-[4.5rem] w-full rounded-2xl" />
        </div>
        <Bone className="mx-1 h-11 w-4/5 bg-transparent" />
      </div>

      <div aria-hidden="true" className="space-y-3">
        <Bone className="h-7 w-44" />
        <Bone className="h-5 w-72 max-w-full" />
        <div className="flex flex-wrap gap-2">
          <Bone className="h-11 w-52 rounded-full" />
          <Bone className="h-11 w-56 rounded-full" />
          <Bone className="h-11 w-48 rounded-full" />
          <Bone className="h-11 w-60 rounded-full" />
          <Bone className="h-11 w-36 rounded-full" />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4"
      >
        <Bone className="h-6 w-32" />
        <Bone className="mt-2 h-4 w-60 max-w-full" />
        <div className="mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: 63 }, (_, i) => (
            <Bone key={i} className="h-14" />
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="h-[5.5rem] rounded-2xl border border-border bg-card" />

      <ToolsCard />
    </div>
  );
}
