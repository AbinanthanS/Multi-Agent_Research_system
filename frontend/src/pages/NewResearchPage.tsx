import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useCreateRun } from "../hooks/useResearch";
import { useToast } from "../hooks/useToast";
import { PageHeader } from "../components/ui/PageHeader";
import { ApiClientError } from "../api/client";

const schema = z.object({
  question: z.string().trim().min(10, "Enter at least 10 characters").max(2000),
  domain: z.string().trim().max(100).optional(),
  maxPapers: z.number({ error: "Enter a paper limit" }).int().min(1).max(100),
});

type FormValues = z.infer<typeof schema>;

const EXAMPLES = [
  "How do foundation models accelerate novel molecular structure generation?",
  "What evidence supports CRISPR base editing as a safer alternative to nuclease editing?",
  "How do retrieval-augmented language models affect factual reliability in scientific QA?",
];

const DOMAINS = [
  "Computational Chemistry",
  "Biomedical Informatics",
  "Machine Learning",
  "Neuroscience",
  "Immunology",
];

export function NewResearchPage() {
  const navigate = useNavigate();
  const create = useCreateRun();
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { question: "", domain: "", maxPapers: 20 },
  });
  const question = form.watch("question");

  async function onSubmit(values: FormValues) {
    const filters: { maxPapers: number; domain?: string } = {
      maxPapers: values.maxPapers,
    };
    if (values.domain?.trim()) filters.domain = values.domain.trim();
    try {
      const run = await create.mutateAsync({
        question: values.question.trim(),
        filters,
      });
      toast("Research run created.", "success");
      navigate(`/research/${run.id}`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : "Unable to create the research run.";
      toast(message, "error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="New investigation"
        title="Frame a research question"
        description="The system will search academic literature, extract evidence-grounded claims, verify support classifications, and synthesize a review report."
      />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="question" className="mb-2 block text-sm text-fg-secondary">
            Research question
          </label>
          <textarea
            id="question"
            rows={6}
            {...form.register("question")}
            className="w-full rounded-xl border border-line bg-elevated p-4 text-base leading-relaxed text-fg placeholder:text-fg-muted"
            placeholder="What should this investigation answer?"
          />
          <div className="mt-2 flex justify-between text-xs text-fg-muted">
            <span>{form.formState.errors.question?.message}</span>
            <span className="font-mono">{question.length}/2000</span>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.1em] text-fg-muted">Example questions</p>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => form.setValue("question", example, { shouldValidate: true })}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm text-fg-secondary hover:border-accent/40 hover:text-fg"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="domain" className="mb-2 block text-sm text-fg-secondary">
              Research domain <span className="text-fg-muted">(optional)</span>
            </label>
            <input
              id="domain"
              list="domain-options"
              {...form.register("domain")}
              className="h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm"
              placeholder="e.g. Computational Chemistry"
            />
            <datalist id="domain-options">
              {DOMAINS.map((domain) => (
                <option key={domain} value={domain} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="maxPapers" className="mb-2 block text-sm text-fg-secondary">
              Maximum papers
            </label>
            <input
              id="maxPapers"
              type="number"
              min={1}
              max={100}
              {...form.register("maxPapers", { valueAsNumber: true })}
              className="h-10 w-full rounded-lg border border-line bg-elevated px-3 text-sm"
            />
            <p className="mt-1 text-xs text-fg-muted">Discovery is capped at this count (1–100).</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-elevated p-4 text-sm text-fg-secondary">
          <p className="font-medium text-fg">Expected outputs</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Candidate papers from arXiv and Semantic Scholar</li>
            <li>Claims with supporting, contradicting, or contextual passages</li>
            <li>A markdown scientific review you can copy, download, or print</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => form.reset()}
            className="h-10 rounded-lg border border-line px-4 text-sm text-fg-secondary"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="h-10 rounded-lg bg-accent-strong px-4 text-sm text-white disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create research run"}
          </button>
        </div>
      </form>
    </div>
  );
}
