import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { chromium, type Browser } from "playwright-core";
import { createLessonServer } from "../src/server.js";
import { LESSON } from "../src/lesson.js";
import { dispose } from "../src/lab.js";

const server = createLessonServer();
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
const docs = new URL("../docs/", import.meta.url);
let browser: Browser | undefined;
const evidence: string[] = [];
try {
  const executablePath = process.env.BROWSER_EXECUTABLE || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome");
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  await context.addInitScript(`Object.defineProperty(navigator,"clipboard",{value:{writeText:async text=>{window.testCopied=text;}},configurable:true});`);
  const page = await context.newPage(); const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const path of ["/learn.html", "/run.html", "/architecture.html", "/walkthrough.html"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert.equal(await page.locator('nav a[aria-current="page"]').count(), 1);
    assert.equal(await page.locator("h1").count(), 1);
  }
  await page.waitForSelector("pre code[data-syntax-highlighted=true]");
  const reference = await page.locator("pre code").first().evaluate(code => ({ background: getComputedStyle(code.parentElement!).backgroundColor, radius: getComputedStyle(code.parentElement!).borderRadius }));
  await page.locator("button[data-copy]").first().click();
  assert((await page.evaluate(() => (window as Window & { testCopied?: string }).testCopied))!.length > 20);
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("#run-lab").click();
  await page.waitForFunction(() => document.getElementById("run-status")?.textContent === "Complete");
  await page.locator("details").filter({ has: page.locator("#result-data") }).locator("summary").click();
  await page.waitForSelector("#result-data .token");
  assert.equal(await page.locator("#model-steps").innerText(), "0");
  const rendered = await page.locator("#result-data pre code").first().evaluate(code => ({ background: getComputedStyle(code.parentElement!).backgroundColor, radius: getComputedStyle(code.parentElement!).borderRadius }));
  assert.deepEqual(rendered, reference);
  await page.locator("#result-data button[data-copy]").first().click();
  assert.match((await page.evaluate(() => (window as Window & { testCopied?: string }).testCopied))!, /^\{/);
  evidence.push("Actual default practical lab completed through HTTP; JSON syntax tokens and explanation-code styling match; copy controls work.");
  await mkdir(docs, { recursive: true });
  await page.screenshot({ path: new URL("application-preview.png", docs).pathname.replace(/^\/([A-Za-z]:)/, "$1"), fullPage: true });
  await page.locator("#example").selectOption("1");
  await page.locator("#run-lab").click();
  await page.waitForFunction(() => ["Needs attention", "Could not finish"].includes(document.getElementById("run-status")?.textContent || ""));
  evidence.push("The second classroom case exposes its validation or business failure rather than reporting success.");
  if (LESSON.number === 10) {
    assert((await page.locator("#answer").innerText()).includes("fixture"));
    await page.locator("#example").selectOption("2"); await page.locator("#run-lab").click();
    await page.waitForFunction(() => (document.getElementById("answer")?.textContent?.length || 0) > 20);
    await page.locator("#stop").click();
    await page.waitForFunction(() => document.getElementById("run-status")?.textContent === "Cancelled");
    evidence.push("Partial streaming failure retained text; Stop produced a separate Cancelled outcome.");
  }
  await page.locator("#theme").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.goto(base + "/learn.html", { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.locator("#theme").click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/learn.html", "/run.html", "/architecture.html", "/walkthrough.html"]) {
    await page.goto(base + path, { waitUntil: "networkidle" });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Page overflow: ${path}`);
  }
  evidence.push("All five pages load at desktop and mobile widths; theme persists across navigation; no document-width overflow.");
  // Explicit response fixture checks the actual live-answer renderer without a paid provider request.
  await context.route("**/api/config", async route => {
    const response = await route.fetch(); const data = await response.json(); await route.fulfill({ json: { ...data, ready: true } });
  });
  await context.route("**/api/query", route => route.fulfill({ contentType: "application/x-ndjson", body: [
    { type: "started", text: "Renderer fixture" },
    { type: "answer", text: '## Renderer fixture\n\nA **formatted** response.\n\n```ts\nconst safe = true;\n```\n\n<img src=x onerror="window.injected=true"><script>window.injected=true</script>' },
    { type: "result", status: "pass", modelSteps: 1, text: "Renderer-only fixture, no model call" },
  ].map(event => JSON.stringify(event)).join("\n") + "\n" }));
  await page.goto(base, { waitUntil: "networkidle" }); await page.locator("#run-live").click();
  await page.waitForSelector("#answer code.language-typescript[data-syntax-highlighted=true]");
  assert.equal(await page.locator("#answer h2").innerText(), "Renderer fixture");
  assert((await page.locator("#answer .token.keyword").count()) > 0);
  assert.equal(await page.locator("#answer img, #answer script").count(), 0);
  assert.equal(await page.evaluate(() => (window as Window & { injected?: boolean }).injected), undefined);
  evidence.push("Explicit live-response rendering fixture: Markdown headings, TypeScript aliases, syntax colors and unsafe-HTML removal verified.");
  assert.deepEqual(errors, []);
  await writeFile(new URL("browser-qa.json", docs), JSON.stringify({ lesson: LESSON.number, checkedAt: new Date().toISOString(), browser: "isolated headless Chrome", paidProviderCalls: 0, evidence, pageErrors: errors }, null, 2) + "\n");
  console.log(`Lesson ${LESSON.number}: browser QA passed (${evidence.length} evidence groups).`);
} finally {
  await browser?.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await dispose();
}
