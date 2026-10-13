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
      <p className="mb-3 text-xs text-fg-muted">
        Workflow illustration. The execute endpoint does not stream per-agent progress, so stages
        are not shown as live backend events.
      </p>
      <ol className="hidden gap-2 md:grid md:grid-cols-5">
        {PIPELINE_STAGES.map((stage, index) => (
          <li
            key={stage.id}
            className={cn(
              "rounded-xl border p-3",
              visual === "completed" && "border-success/30 bg-success/5",
              visual === "failed" && "border-error/30 bg-error/5",
              visual === "active" && "border-info/30 bg-info/5",
              visual === "pending" && "border-line bg-elevated",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[10px] text-fg-muted">0{index + 1}</span>
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
  if (visual === "active") return <Loader2 size={14} className="animate-spin text-info" />;
  return <Circle size={14} className="text-fg-muted" />;
}
