"""
Quick diagnostic: call the AI service directly to test the optimized pipeline.
Uses the 5-paper cancer genomics run (b575cdd8).
"""
import asyncio
import httpx
import json

RUN_ID = "b575cdd8-eea1-49e0-acc4-4348af6d11bb"
BACKEND_URL = "http://localhost:5000"
AI_URL = "http://127.0.0.1:8000"


async def main():
    async with httpx.AsyncClient(timeout=300.0) as client:
        # Step 1: Get papers for the run
        print("Fetching papers for run...")
        r = await client.get(f"{BACKEND_URL}/api/v1/research-runs/{RUN_ID}/papers")
        papers_data = r.json()
        papers = papers_data.get("data", {}).get("papers", [])
        print(f"  Found {len(papers)} papers")
        if not papers:
            print("  ERROR: No papers found! Run paper discovery first.")
            return

        # Step 2: Get run details
        r2 = await client.get(f"{BACKEND_URL}/api/v1/research-runs/{RUN_ID}")
        run = r2.json().get("data", {})
        question = run.get("question", "")
        print(f"  Question: {question[:60]}...")

        # Step 3: Call AI service directly (skip backend status update)
        print("\nCalling AI service execute endpoint...")
        payload = {
            "run_id": RUN_ID,
            "question": question,
            "papers": [
                {
                    "id": p["id"],
                    "title": p["title"],
                    "abstract": p.get("abstract"),
                    "authors": p.get("authors", []),
                    "published_year": p.get("published_year"),
                    "url": p.get("url"),
                    "pdf_url": p.get("pdf_url"),
                }
                for p in papers
            ],
        }

        import time
        t0 = time.time()
        try:
            ai_resp = await client.post(f"{AI_URL}/api/v1/research/execute", json=payload)
            elapsed = time.time() - t0
            print(f"  AI service responded in {elapsed:.1f}s with status {ai_resp.status_code}")

            if ai_resp.status_code == 200:
                result = ai_resp.json()
                passages = result.get("passages", [])
                claims = result.get("claims", [])
                report = result.get("report", {})
                print(f"\n[SUCCESS]")
                print(f"  Passages generated: {len(passages)}")
                print(f"  Claims extracted:   {len(claims)}")
                print(f"  Report title:       {report.get('title', '(none)')}")
                print(f"  Report length:      {len(report.get('markdown_content', ''))} chars")
                if claims:
                    print(f"\n  First claim ({claims[0].get('claim_type', '?')}): {claims[0].get('claim_text', '')[:100]}...")
                if report.get("markdown_content"):
                    print(f"\n  Report preview:\n{report['markdown_content'][:400]}...")
            else:
                print(f"\n[FAILED]: {ai_resp.text[:500]}")

        except Exception as e:
            elapsed = time.time() - t0
            print(f"\n[EXCEPTION] after {elapsed:.1f}s: {e}")


asyncio.run(main())
