import assert from "node:assert/strict";
import { test, after } from "node:test";
import { executeLab, dispose } from "../src/lab.js";
import { LESSON } from "../src/lesson.js";
const run = (input: unknown) => executeLab(input, () => {}, new AbortController().signal);
after(async () => { await dispose(); });

test("transient failures retry only before visible text", async () => {
  const first = await run({ scenario: "transient-before-text", chunkDelayMs: 10, maxAttempts: 2 });
  assert.equal(first.status, "pass"); assert.equal((first.data as { attempts: number }).attempts, 2);
  const partial = await run({ scenario: "partial-failure", chunkDelayMs: 10, maxAttempts: 2 });
  const data = partial.data as { attempts: number; visibleCharacters: number; completed: boolean };
  assert.equal(partial.status, "needs-attention"); assert.equal(data.attempts, 1); assert(data.visibleCharacters > 0); assert.equal(data.completed, false);
  const permanent = await run({ scenario: "permanent-before-text", chunkDelayMs: 10, maxAttempts: 2 });
  assert.equal((permanent.data as { attempts: number }).attempts, 1);
});
test("mid-stream cancellation aborts rather than retrying", async () => {
  const controller = new AbortController(); let chunks = 0;
  await assert.rejects(executeLab({ scenario: "success", chunkDelayMs: 10, maxAttempts: 2 }, event => {
    if (event.type === "delta" && ++chunks === 1) controller.abort();
  }, controller.signal), { name: "AbortError" });
  assert.equal(chunks, 1);
});
