"""CLI entry point.

Usage:
    python main.py "The impact of AI on the job market in 2026"
    python main.py "quantum computing 2026" --out reports/qc.md
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from src.config import get_settings
from src.pipelines.pipeline import PipelineError, run_research_pipeline
from src.utils.logger import get_logger, setup_logging


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the multi-agent research pipeline.")
    parser.add_argument("topic", nargs="?", default="The impact of AI on the job market in 2026")
    parser.add_argument("--out", type=Path, default=None, help="Path to write the markdown report to.")
    parser.add_argument("--json", action="store_true", help="Also print the full structured result as JSON.")
    return parser.parse_args()


def main() -> int:
    settings = get_settings()
    setup_logging(level=settings.log_level, json_output=settings.log_json)
    logger = get_logger("main")

    args = parse_args()

    try:
        result = run_research_pipeline(args.topic)
    except PipelineError as exc:
        logger.error("Pipeline failed: %s", exc)
        return 1

    print("\n" + "=" * 70)
    print(result.report_markdown)
    print("=" * 70)
    print(f"\nCritic score: {result.critique.score}/10 — {result.critique.verdict}")
    print(f"Completed in {result.duration_seconds}s")

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(result.report_markdown, encoding="utf-8")
        logger.info("Report written to %s", args.out)

    if args.json:
        print(result.model_dump_json(indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
