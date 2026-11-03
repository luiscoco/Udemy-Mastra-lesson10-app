import assert from "node:assert/strict";
import { test, after } from "node:test";
import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { createMockModel } from "@mastra/core/test-utils/llm-mock";
import { LESSON } from "../src/lesson.js";
import { executeLab, executeLive, dispose } from "../src/lab.js";
import { runLesson } from "../src/runner.js";
import { type AgentModel, type LabEvent } from "../src/core.js";
import { createLessonServer } from "../src/server.js";
import { buildPages, buildReadme } from "../scripts/build-pages.js";

const signal = () => new AbortController().signal;
after(async () => { await dispose(); });

test("the default classroom input executes the real local operation", async () => {
  const events: LabEvent[] = [];
  const result = await runLesson("lab", LESSON.examples[0].input, LESSON.defaultQuestion, event => events.push(event), signal());
  assert.equal("status" in result && result.status, "pass");
  assert(events.some(event => event.type === "stage"));
  assert.equal(events.at(-1)?.type, "result");
  assert.equal(events.at(-1)?.modelSteps, 0);
});

test("strict input validation rejects unexpected properties before execution", async () => {
  await assert.rejects(executeLab({ ...(LESSON.examples[0].input as object), arbitraryShellCommand: "never execute" }, () => {}, signal()));
});

test("cancellation is not converted to a successful result", async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runLesson("lab", LESSON.examples[0].input, LESSON.defaultQuestion, () => {}, controller.signal), { name: "AbortError" });
});

test("live integration invokes the actual SDK with an explicit offline model adapter", async () => {
  const card = { topic: "Mastra tools", summary: "Tools expose typed application operations to an agent.", prerequisites: ["TypeScript basics"], keyPoints: ["Descriptions guide tool selection", "Schemas validate supplied input", "Application code performs the operation"] };
  let calls = 0;
  const mockText = LESSON.number === 9 ? card : LESSON.number === 6 ? "- Typed tools expose operations.\n- Validation checks supplied input.\n- Missing records require clarification." : "## SDK adapter response\n\nAn explicit offline test response.\n\n```typescript\nconst verified = true;\n```";
  const mock = createMockModel({ version: "v2", mockText, ...(LESSON.number === 9 ? { objectGenerationMode: "json" as const } : {}), spyGenerate: () => { calls++; }, spyStream: () => { calls++; } });
  const events: LabEvent[] = [];
  const result = await executeLive(LESSON.examples[0].input, LESSON.defaultQuestion, event => events.push(event), signal(), mock as AgentModel);
  assert(calls > 0, "The SDK must invoke the injected model adapter");
  assert.equal(result.finished, true);
  assert(result.steps >= 1);
  assert(events.some(event => event.type === "answer" || event.type === "delta"));
});

test("generated pages and source excerpts match this repository", async () => {
  const pages = await buildPages();
  assert.equal(Object.keys(pages).filter(name => name.endsWith(".html")).length, 5);
  for (const [name, content] of Object.entries(pages)) {
    assert.equal(await readFile(new URL(`../public/${name}`, import.meta.url), "utf8"), content, `${name} requires a rebuild`);
    if (name.endsWith(".html")) { assert(content.includes("/code-highlighting.js")); assert(content.includes("aria-current=\"page\"")); }
  }
  assert.equal(await readFile(new URL("../README.md", import.meta.url), "utf8"), await buildReadme());
});

test("HTTP host serves the app, validates envelopes and protects the local boundary", async () => {
  const server = createLessonServer();
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.equal((await fetch(base + "/api/health")).status, 200);
    const config = await (await fetch(base + "/api/config")).json() as { lesson: { number: number } };
    assert.equal(config.lesson.number, LESSON.number);
    assert.equal((await fetch(base + "/.env")).status, 404);
    const body = JSON.stringify({ input: LESSON.examples[0].input, question: LESSON.defaultQuestion });
    assert.equal((await fetch(base + "/api/lab", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.invalid" }, body })).status, 403);
    assert.equal((await fetch(base + "/api/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 400);
    assert.equal((await fetch(base + "/api/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(24001) })).status, 413);
    const response = await fetch(base + "/api/lab", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    assert.equal(response.status, 200);
    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line) as LabEvent);
    assert.equal(events.at(-1)?.status, "pass");
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
