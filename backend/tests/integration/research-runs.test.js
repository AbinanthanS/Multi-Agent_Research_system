import test from "node:test";
import assert from "node:assert/strict";

import app from "../../src/app.js";
import { pool } from "../../src/config/database.js";

test("research runs API persists and validates data", async (t) => {
  if (
    process.env.NODE_ENV !== "test" ||
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Integration tests require a dedicated test database",
    );
  }

  const createdIds = [];
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  t.after(async () => {
    try {
      if (createdIds.length > 0) {
        await pool.query(
          "DELETE FROM research_runs WHERE id = ANY($1::uuid[])",
          [createdIds],
        );
      }
    } finally {
      try {
        await new Promise((resolve, reject) => {
          server.close((error) =>
            error ? reject(error) : resolve(),
          );
        });
      } finally {
        await pool.end();
      }
    }
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const baseUrl =
    `http://127.0.0.1:${address.port}/api/v1/research-runs`;

  const jsonHeaders = {
    "Content-Type": "application/json",
  };

  // Helper: create a research run and track it for cleanup.
  async function createRun(question) {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ question }),
    });

    assert.equal(response.status, 201);

    const body = await response.json();
    const run = body.data;

    createdIds.push(run.id);

    return run;
  }

  // 1. Invalid input must return HTTP 400.
  const invalidResponse = await fetch(baseUrl, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ question: "" }),
  });

  assert.equal(invalidResponse.status, 400);

  const invalidBody = await invalidResponse.json();
  assert.equal(invalidBody.error.code, "VALIDATION_ERROR");

  // 2. Create a research run.
  const createResponse = await fetch(baseUrl, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      question:
        "How are retrieval-augmented generation systems evaluated?",
      filters: {
        yearFrom: 2020,
        yearTo: 2026,
        maxPapers: 15,
      },
    }),
  });

  assert.equal(createResponse.status, 201);

  const createdBody = await createResponse.json();
  const created = createdBody.data;

  createdIds.push(created.id);

  assert.ok(created.id);
  assert.equal(created.status, "pending");
  assert.equal(created.filters.maxPapers, 15);
  assert.equal(created.version, 1);

  // 3. Retrieve the research run.
  const getResponse = await fetch(`${baseUrl}/${created.id}`);

  assert.equal(getResponse.status, 200);

  const retrievedBody = await getResponse.json();
  const retrieved = retrievedBody.data;

  assert.equal(retrieved.id, created.id);
  assert.equal(retrieved.question, created.question);
  assert.equal(retrieved.version, 1);

  // 4. Update the question using the current version.
  const updatedQuestion =
    "How are modern RAG systems evaluated for scientific question answering?";

  const patchResponse = await fetch(`${baseUrl}/${created.id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({
      expectedVersion: retrieved.version,
      question: updatedQuestion,
    }),
  });

  assert.equal(patchResponse.status, 200);

  const patchedBody = await patchResponse.json();
  const patched = patchedBody.data;

  assert.equal(patched.id, created.id);
  assert.equal(patched.question, updatedQuestion);
  assert.equal(patched.version, 2);

  // 5. A stale version must not overwrite the latest update.
  const stalePatchResponse = await fetch(`${baseUrl}/${created.id}`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({
      expectedVersion: 1,
      question:
        "This stale update must not overwrite the latest question.",
    }),
  });

  assert.equal(stalePatchResponse.status, 409);

  const staleBody = await stalePatchResponse.json();
  assert.equal(staleBody.error.code, "VERSION_CONFLICT");

  // 6. Verify the stale update did not change the record.
  const verifyResponse = await fetch(`${baseUrl}/${created.id}`);

  assert.equal(verifyResponse.status, 200);

  const verifiedBody = await verifyResponse.json();
  const verified = verifiedBody.data;

  assert.equal(verified.question, updatedQuestion);
  assert.equal(verified.version, 2);
  assert.equal(verified.status, "pending");

  // 7. An invalid status transition must return HTTP 409.
  // pending -> completed is not allowed.
  const invalidTransitionResponse = await fetch(
    `${baseUrl}/${created.id}`,
    {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify({
        expectedVersion: verified.version,
        status: "completed",
      }),
    },
  );

  assert.equal(invalidTransitionResponse.status, 409);

  const transitionBody = await invalidTransitionResponse.json();

  assert.equal(
    transitionBody.error.code,
    "INVALID_STATUS_TRANSITION",
  );

  // Verify the rejected transition changed neither status nor version.
  const afterTransitionResponse = await fetch(
    `${baseUrl}/${created.id}`,
  );

  assert.equal(afterTransitionResponse.status, 200);

  const afterTransitionBody = await afterTransitionResponse.json();

  assert.equal(afterTransitionBody.data.status, "pending");
  assert.equal(afterTransitionBody.data.version, 2);

  // 8. Two concurrent updates using the same version:
  // exactly one should succeed and one should conflict.
  const concurrentQuestions = [
    "Concurrent update A: evaluate scientific RAG systems.",
    "Concurrent update B: compare scientific RAG evaluation methods.",
  ];

  const concurrentResponses = await Promise.all(
    concurrentQuestions.map((question) =>
      fetch(`${baseUrl}/${created.id}`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({
          expectedVersion: 2,
          question,
        }),
      }),
    ),
  );

  const concurrentStatuses = concurrentResponses
    .map((response) => response.status)
    .sort((a, b) => a - b);

  assert.deepEqual(concurrentStatuses, [200, 409]);

  const concurrentBodies = await Promise.all(
    concurrentResponses.map((response) => response.json()),
  );

  const conflictIndex = concurrentStatuses.indexOf(409);

  // Check the actual response that returned HTTP 409.
  assert.equal(
    concurrentBodies[
      concurrentResponses.findIndex(
        (response) => response.status === 409,
      )
    ].error.code,
    "VERSION_CONFLICT",
  );

  // Verify exactly one update was committed.
  const afterConcurrentResponse = await fetch(
    `${baseUrl}/${created.id}`,
  );

  assert.equal(afterConcurrentResponse.status, 200);

  const afterConcurrentBody = await afterConcurrentResponse.json();
  const afterConcurrent = afterConcurrentBody.data;

  assert.ok(concurrentQuestions.includes(afterConcurrent.question));
  assert.equal(afterConcurrent.version, 3);
  assert.equal(afterConcurrent.status, "pending");

  // Avoid an unused local variable warning.
  void conflictIndex;

  // 9. Invalid pagination must return HTTP 400.
  const invalidLimitResponse = await fetch(
    `${baseUrl}?limit=500`,
  );

  assert.equal(invalidLimitResponse.status, 400);

  const negativeOffsetResponse = await fetch(
    `${baseUrl}?limit=10&offset=-1`,
  );

  assert.equal(negativeOffsetResponse.status, 400);

  // 10. Create a second run so page two can contain a record.
  const secondRun = await createRun(
    "How can evidence traceability improve scientific literature reviews?",
  );

  assert.ok(secondRun.id);
  assert.notEqual(secondRun.id, created.id);

  // 11. Listing should return valid pagination metadata.
  const listResponse = await fetch(
    `${baseUrl}?limit=10&offset=0`,
  );

  assert.equal(listResponse.status, 200);

  const listBody = await listResponse.json();
  const listed = listBody.data;

  assert.ok(Array.isArray(listed.items));
  assert.equal(listed.pagination.limit, 10);
  assert.equal(listed.pagination.offset, 0);
  assert.ok(listed.pagination.total >= 2);

  assert.equal(
    listed.pagination.hasMore,
    listed.pagination.offset + listed.items.length <
    listed.pagination.total,
  );

  const listedRun = listed.items.find(
    (run) => run.id === created.id,
  );

  assert.ok(listedRun);
  assert.equal(listedRun.version, 3);

  // 12. A nonzero offset should return the second page.
  const secondPageResponse = await fetch(
    `${baseUrl}?limit=1&offset=1`,
  );

  assert.equal(secondPageResponse.status, 200);

  const secondPageBody = await secondPageResponse.json();
  const secondPage = secondPageBody.data;

  assert.equal(secondPage.pagination.limit, 1);
  assert.equal(secondPage.pagination.offset, 1);
  assert.equal(secondPage.items.length, 1);

  assert.equal(
    secondPage.pagination.hasMore,
    secondPage.pagination.offset + secondPage.items.length <
    secondPage.pagination.total,
  );

  // 13. A nonexistent research run must return HTTP 404.
  const missingResponse = await fetch(
    `${baseUrl}/00000000-0000-4000-8000-000000000000`,
  );

  assert.equal(missingResponse.status, 404);

  const missingBody = await missingResponse.json();

  assert.equal(
    missingBody.error.code,
    "RESEARCH_RUN_NOT_FOUND",
  );
});