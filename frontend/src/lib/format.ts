import type { ResearchPaper } from "../types/domain";

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDuration(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return null;
  const seconds = Math.round((b - a) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) return rem ? `${minutes}m ${rem}s` : `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function formatRelative(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const delta = Date.now() - date.getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return formatDate(value);
}

export function formatAuthors(authors: unknown): string | null {
  if (!authors) return null;
  if (typeof authors === "string") {
    const trimmed = authors.trim();
    return trimmed || null;
  }
  if (Array.isArray(authors)) {
    const names = authors
      .map((author) => {
        if (typeof author === "string") return author.trim();
        if (author && typeof author === "object" && "name" in author) {
          return String((author as { name: unknown }).name ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);
    return names.length ? names.join(", ") : null;
  }
  return null;
}

export function formatConfidence(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

export function confidenceRatio(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value <= 1 ? value : Math.min(value / 100, 1);
}

export function parseStructuredContent(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

export function paperYear(paper: ResearchPaper): number | null {
  return typeof paper.published_year === "number" ? paper.published_year : null;
}
