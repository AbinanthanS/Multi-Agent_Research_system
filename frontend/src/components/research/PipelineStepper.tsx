import { Check, Circle, Loader2, X } from "lucide-react";
import { cn } from "../../lib/cn";
import type { ResearchRunStatus } from "../../types/domain";

const PIPELINE_STAGES = [
  {
    id: "ingest",
    title: "PDF Ingestion & Chunking",
    description: "Extract passages from available paper text and PDFs.",
  },
  {
    id: "planner",
    title: "Planner — Query Decomposition",
    description: "Break the research question into retrieval sub-queries.",
  },
  {
    id: "extractor",
    title: "Extractor — Evidence Retrieval",
    description: "Retrieve candidate passages for each sub-question.",
  },
  {
    id: "critic",
    title: "Critic — Claim Verification",
    description: "Classify evidence as supporting, contradicting, or contextual.",
  },
  {
    id: "synthesizer",
    title: "Synthesizer — Report Generation",
    description: "Compose a grounded scientific review from verified claims.",
  },
] as const;

type StageVisual = "pending" | "active" | "completed" | "failed";

function stageVisual(runStatus: ResearchRunStatus | undefined, executing: boolean): StageVisual {
  if (runStatus === "completed") return "completed";
  if (runStatus === "failed") return "failed";
  if (executing || runStatus === "running") return "active";
  return "pending";
}

export function PipelineStepper({
  runStatus,
  executing,
}: {
  runStatus?: ResearchRunStatus;
  executing?: boolean;
}) {
  const visual = stageVisual(runStatus, Boolean(executing));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-fg-muted">
          Multi-agent execution graph
        </p>
        {visual === "active" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/30 px-2.5 py-0.5 text-[11px] font-medium text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Agents working…
          </span>
        )}
      </div>
      <ol className="hidden gap-2 md:grid md:grid-cols-5">
        {PIPELINE_STAGES.map((stage, index) => (
          <li
            key={stage.id}
            className={cn(
              "rounded-xl border p-3.5 transition-all duration-200",
              visual === "completed" && "border-success/30 bg-success/5 shadow-[0_0_15px_-3px_rgba(16,185,129,0.08)]",
              visual === "failed" && "border-error/30 bg-error/5 shadow-[0_0_15px_-3px_rgba(244,63,94,0.08)]",
              visual === "active" && "border-accent/40 bg-accent/5 shadow-[0_0_20px_-3px_rgba(139,92,246,0.15)] ring-1 ring-accent/30",
              visual === "pending" && "border-line bg-elevated/70",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-medium text-fg-muted">0{index + 1}</span>
              <StageIcon visual={visual} />
            </div>
            <p className="text-xs font-medium text-fg">{stage.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">{stage.description}</p>
          </li>
        ))}
      </ol>
      <ol className="space-y-3 md:hidden">
        {PIPELINE_STAGES.map((stage, index) => (
          <li key={stage.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <StageIcon visual={visual} />
              {index < PIPELINE_STAGES.length - 1 ? (
                <div className="mt-1 h-full w-px flex-1 bg-line" />
              ) : null}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium text-fg">{stage.title}</p>
              <p className="mt-1 text-xs text-fg-muted">{stage.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StageIcon({ visual }: { visual: StageVisual }) {
  if (visual === "completed") return <Check size={14} className="text-success" />;
  if (visual === "failed") return <X size={14} className="text-error" />;
  if (visual === "active") {
    return (
      <div className="relative flex items-center justify-center">
        <Loader2 size={14} className="animate-spin text-accent" />
      </div>
    );
  }
  return <Circle size={14} className="text-fg-muted/60" />;
}
