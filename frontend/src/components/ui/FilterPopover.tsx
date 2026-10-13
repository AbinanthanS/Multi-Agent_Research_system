import { Filter } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ResearchRunStatus } from "../../types/domain";
import { cn } from "../../lib/cn";

const STATUSES: Array<ResearchRunStatus | "all"> = [
  "all",
  "pending",
  "running",
  "completed",
  "failed",
];

export function FilterPopover({
  value,
  onChange,
}: {
  value: ResearchRunStatus | "all";
  onChange: (value: ResearchRunStatus | "all") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-fg-secondary hover:text-fg"
        aria-expanded={open}
      >
        <Filter size={14} />
        {value === "all" ? "All statuses" : value}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-line bg-elevated p-1 shadow-xl">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onChange(status);
                setOpen(false);
              }}
              className={cn(
                "block w-full rounded-lg px-3 py-1.5 text-left text-sm capitalize",
                value === status ? "bg-surface text-fg" : "text-fg-secondary hover:bg-surface",
              )}
            >
              {status === "all" ? "All statuses" : status}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
