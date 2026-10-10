import test from "node:test";
import assert from "node:assert/strict";

import app from "../src/app.js";

test("GET /health returns a successful health response", async (t) => {
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  t.after(() => {
    server.close();
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const response = await fetch(
    `http://127.0.0.1:${address.port}/health`,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: {
      status: "ok",
      service: "sciresearch-backend",
    },
  });
});
