import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { LESSON as L } from "../src/lesson.js";

const ROOT = new URL("../", import.meta.url);
const number = String(L.number).padStart(2, "0");
const repository = `https://github.com/luiscoco/Udemy-Mastra-lesson${number}-app`;
const esc = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
let codeId = 0;
function code(text: string, language: string, caption: string) {
  const id = `code-${++codeId}`;
  return `<div class="code-toolbar"><p class="source">${caption}</p><button type="button" data-copy="${id}">Copy code</button></div><pre><code id="${id}" class="language-${language}">${esc(text)}</code></pre>`;
}
async function source(path: string, from?: string) {
  const lines = (await readFile(new URL(path, ROOT), "utf8")).trimEnd().split(/\r?\n/);
  const first = from ? lines.findIndex(line => line.includes(from)) : 0;
  if (first < 0) throw new Error(`Missing source range: ${path}`);
  return code(lines.slice(first).join("\n"), "typescript", `<a href="${repository}/blob/main/${path}#L${first + 1}-L${lines.length}">${esc(path)} · lines ${first + 1}–${lines.length}</a>`);
}
function page(current: string, title: string, heading: string, lead: string, body: string) {
  const nav = [["index.html", "Application lab"], ["learn.html", "What you will learn"], ["run.html", "How to run"], ["architecture.html", "Architecture & workflow"], ["walkthrough.html", "Code walkthrough"]];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(L.description)}"><title>Mastra · Lesson ${number} · ${esc(title)}</title><link rel="icon" href="/astronaut.png"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/lesson.css"><link rel="stylesheet" href="/lab.css"><link rel="stylesheet" href="/code-highlighting.css"></head><body><a class="skip-link" href="#content">Skip to lesson content</a><main><div class="brand"><a href="/">How <span>Mastra</span> Works</a><span class="badge">LESSON ${number} / ${esc(L.shortTitle.toUpperCase())}</span></div><header class="hero"><div><div class="eyebrow">${esc(L.eyebrow)}</div><h1>${heading}</h1><p class="lead">${lead}</p></div><img src="/astronaut.png" width="190" height="190" alt="Course astronaut mascot"></header><nav class="nav" aria-label="Application sections">${nav.map(([path, label]) => `<a href="${path === "index.html" ? "/" : "/" + path}"${path === current ? ' aria-current="page"' : ""}>${label}</a>`).join("")}<button type="button" id="theme">Dark mode</button></nav><div id="content" tabindex="-1">${body}</div><footer>MASTRA AI AGENTS · LESSON ${number} · ${esc(L.title.toUpperCase())}<br>Independent TypeScript application · provider credentials stay on the server<br><a href="${repository}">Source on GitHub</a> · <a href="https://mastra.ai/docs">Official Mastra documentation</a></footer></main><script src="/navigation.js"></script><script src="/prism.js"></script><script src="/code-highlighting.js"></script>${current === "index.html" ? '<script type="module" src="/client.js"></script>' : ""}</body></html>\n`;
}
export async function buildPages() {
  codeId = 0;
  const cards = L.objectives.map((item, index) => `<article class="card"><span class="number">${String(index + 1).padStart(2, "0")}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join("");
  const index = page("index.html", L.shortTitle, `${esc(L.hero)} <em>${esc(L.accent)}</em>`, esc(L.description), `
<div class="flow"><div><b>01 · Configure</b><p>Edit the practical input</p></div><span aria-hidden="true">→</span><div><b>02 · Execute</b><p>Observe the actual operation</p></div><span aria-hidden="true">→</span><div><b>03 · Verify</b><p>Inspect the result and boundary</p></div></div>
<section class="workspace lab-workspace"><article class="panel"><p class="eyebrow">LESSON ${number} PRACTICAL APPLICATION</p><h2>${esc(L.labTitle)}</h2><p>${esc(L.labDescription)}</p><p class="pill-row"><span class="status-pill" id="provider-status">Checking local configuration</span></p><p class="meta" id="model-name">No provider call has been made.</p><label for="example">Choose a classroom case</label><select id="example"><option>Loading examples…</option></select><p class="meta" id="expected">Expected behavior will appear here.</p><label for="lab-input">Practical input (JSON)</label><textarea id="lab-input" spellcheck="false" rows="12">${esc(JSON.stringify(L.examples[0].input, null, 2))}</textarea><label for="question">Optional live-agent question</label><textarea id="question" maxlength="1500" rows="3">${esc(L.defaultQuestion)}</textarea><div class="actions"><button id="run-lab" type="button" class="primary">Run practical lab</button><button id="run-live" type="button" disabled>Run live agent</button><button id="stop" type="button" disabled>Stop</button></div><p class="run-explanation"><strong>Practical lab:</strong> ${esc(L.localMode)}.<br><strong>Live agent:</strong> a separate real provider call, available after configuration. It may incur API usage.</p><details><summary>What this example implements</summary><p>${esc(L.scope)}</p></details></article>
<article class="panel"><div class="output-heading"><h2>Result & execution</h2><span class="status-pill" id="run-mode">Ready to explore</span></div><div class="stats four"><div class="stat"><span>Run state</span><strong id="run-status">Ready</strong></div><div class="stat"><span>Observed events</span><strong id="event-count">0</strong></div><div class="stat"><span>Model steps</span><strong id="model-steps">0</strong></div><div class="stat"><span>Elapsed</span><strong id="elapsed">—</strong></div></div><div id="answer" aria-live="polite" aria-label="Practical result or agent answer"></div><p id="feedback" class="meta" role="status" aria-live="polite"></p><details open><summary>Execution events</summary><ol id="events" aria-live="polite"></ol></details><details><summary>Structured result metadata</summary><div id="result-data"></div></details><p class="footnote">Events describe executed operations. They are not hidden model reasoning. Inspect the task outcome as well as the runtime state.</p></article></section>
<section class="step"><h2>Try, compare, explain.</h2><p>${esc(L.exercise)}</p><div class="grid">${cards}</div></section><div class="actions"><a class="button" href="/learn.html">Understand the concepts →</a><a class="button" href="/walkthrough.html">Inspect the actual code →</a></div>`);
  const learn = page("learn.html", "What you will learn", "Understand the <em>lesson boundaries.</em>", esc(L.title), `<div class="grid">${cards}</div><section class="step"><h2>Check your understanding</h2>${L.checks.map(item => `<details><summary>${esc(item.question)}</summary><p>${esc(item.answer)}</p></details>`).join("")}</section><section class="note"><strong>Implemented scope:</strong> ${esc(L.scope)}</section><section class="step"><h2>Practical exercise</h2><p>${esc(L.exercise)}</p></section><div class="actions"><a class="button" href="/">← Return to the lab</a><a class="button" href="/architecture.html">Follow the execution →</a></div>`);
  const setup = `git clone ${repository}.git\ncd Udemy-Mastra-lesson${number}-app\nnpm ci\nnpm start`;
  const env = `OPENAI_API_KEY=your_api_key\nMASTRA_MODEL=openai/gpt-4.1-mini\nPORT=${3200 + L.number}`;
  const studio = [3, 8].includes(L.number) ? `<section class="step"><h2>Launch the actual Mastra developer workspace</h2>${code("npm run studio", "powershell", "A separate terminal runs the pinned Mastra CLI")}<p>Use the address printed by the CLI. This project selects <strong>http://localhost:${4200 + L.number}</strong>. The student application and Studio run in separate processes. The conventional <code>src/mastra/index.ts</code> exports the registered Mastra instance.</p>${L.number === 8 ? '<p>Lesson 8 stores native trace data locally under the ignored <code>.mastra</code> directory. It configures MastraStorageExporter and LibSQL, not an external telemetry service or aggregate metrics backend.</p>' : ""}</section>` : "";
  const run = page("run.html", "How to run", "Start the <em>working application.</em>", "Install the independent project, run the practical operation, then configure a provider only for the live path.", `<section class="step"><span class="number">01</span><h2>Clone, install and start</h2><p>Use Node.js 24 or newer. The committed lockfile fixes this project's dependencies. Starting the host makes no provider call.</p>${code(setup, "powershell", "Run the completed application")}<p>Open <a href="http://127.0.0.1:${3200 + L.number}">http://127.0.0.1:${3200 + L.number}</a>. Choose <strong>Run practical lab</strong> first. Keep the terminal open; Ctrl+C stops the host.</p></section><section class="step"><span class="number">02</span><h2>Try the cases and inspect evidence</h2><ul>${L.examples.map(item => `<li><strong>${esc(item.name)}:</strong> ${esc(item.expected)}</li>`).join("")}</ul><p>The cases are editable classroom inputs, not fabricated model responses. Local outcomes come from executing the actual implementation.</p></section><section class="step"><span class="number">03</span><h2>Configure the optional live agent</h2>${code('if (!(Test-Path .env)) { Copy-Item .env.example .env }\nnotepad .env', "powershell", "PowerShell: preserve an existing local configuration")}${code(env, "dotenv", "Enter your own provider key locally, then restart with npm start")}<p>Use a model your provider account can access. Credentials stay on the server and are ignored by Git. Existing shell values take precedence over the optional file. No credential is copied from lesson 1 or another application.</p>${L.number === 5 ? '<p>For the provider-config lab, configure <code>ANTHROPIC_API_KEY</code> or <code>GOOGLE_GENERATIVE_AI_API_KEY</code> only when selecting that provider. Run the local configuration review before the live request. Parameter support must be checked for the selected model.</p>' : ""}<details><summary>Bash alternative</summary>${code('[ -f .env ] || cp .env.example .env\n# Edit .env with your own values.\nnpm start', "bash", "Bash: local environment setup")}</details></section>${studio}<section class="step"><h2>Terminal examples and checks</h2>${code('npm run sample\nnpm run sample:live\nnpm run build\nnpm test\nnpm run test:browser', "powershell", "The normal sample and offline tests need no provider key")}<p>The live sample is a real provider request. Browser checks use an installed Chrome/Chromium executable; set <code>BROWSER_EXECUTABLE</code> if it is not in the standard location. Tests use explicit SDK fixtures for model integration, not paid API calls.</p><p>Rebuild after source changes. The five pages, their source line references and the browser bundle are generated from this project's actual files.</p></section><section class="step"><h2>Troubleshooting boundaries</h2><div class="table"><table><thead><tr><th>Finding</th><th>Next check</th></tr></thead><tbody><tr><td>Invalid JSON or schema</td><td>Repair the submitted input before changing models or credentials.</td></tr><tr><td>Needs attention</td><td>Read the business result and validation details; SDK execution alone may have succeeded.</td></tr><tr><td>Live key not configured</td><td>Set the selected provider's key locally and restart. The practical operation remains available.</td></tr><tr><td>Provider failure</td><td>Check account access, model identity, supported options and network access. Raw provider exceptions are not displayed.</td></tr><tr><td>Port in use</td><td>Stop your existing host or choose a different PORT. Follow the printed URL.</td></tr><tr><td>Partial text after Stop</td><td>Cancellation is distinct from completion. Partial text is retained as incomplete evidence.</td></tr></tbody></table></div></section>`);
  const sourceSections: string[] = [];
  for (const path of L.sourceFiles) sourceSections.push(`<section class="step"><h2>${esc(path)}</h2><p>This excerpt is generated from the actual implementation. The complete file and its line range are linked below.</p>${await source(path)}</section>`);
  sourceSections.push(`<section class="step"><h2>Shared generation boundary</h2><p>The common helper calls the real Agent API with explicit limits. Lesson-specific code selects the registered agent, inputs and additional validation.</p>${await source("src/core.ts", "export async function generateAnswer")}</section>`);
  const walkthrough = page("walkthrough.html", "Code walkthrough", "Explain the <em>actual source.</em>", esc(L.title), `<section class="note">${esc(L.scope)} The links and excerpts are generated from this repository; no pseudocode is presented as a running SDK integration.</section>${sourceSections.join("")}<section class="step"><h2>Make one focused change</h2><p>${esc(L.exercise)}</p></section>`);
  const architecture = page("architecture.html", "Architecture and workflow", "Trace the <em>practical operation.</em>", esc(L.localMode), `<section class="step"><h2>What this sequence shows</h2><p>${esc(L.labDescription)}</p><p>The diagram follows the local practical path. The separately labelled live path invokes the registered agent and provider; it is not silently substituted for the local operation.</p><a class="button" href="/architecture.svg" download>Download the sequence SVG</a></section><div class="diagram"><img src="/architecture.svg" alt="${esc(L.workflow.join(' → '))}"></div>${L.workflow.map((step, index) => `<section class="step"><span class="number">${String(index + 1).padStart(2, "0")}</span><h3>${esc(step)}</h3><p>Compare this boundary with the actual implementation and the observed event log in the application lab.</p></section>`).join("")}<section class="step"><h2>Local host and execution envelope</h2>${await source("src/runner.ts")}</section><section class="note">${esc(L.scope)}</section><div class="actions"><a class="button" href="/walkthrough.html">Inspect lesson-specific code →</a><a class="button" href="/">Run and compare evidence →</a></div>`);
  const svgHeight = 260 + L.workflow.length * 125;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="${svgHeight}" viewBox="0 0 1280 ${svgHeight}" role="img"><title>Lesson ${number}: ${esc(L.title)}</title><defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto"><path d="M0 0L10 4L0 8" fill="none" stroke="#087fff" stroke-width="1.5"/></marker></defs><rect width="1280" height="${svgHeight}" rx="24" fill="#fff"/><g font-family="Segoe UI,Arial,sans-serif" fill="#101a44"><text x="40" y="55" font-size="30" font-weight="700">Lesson ${number} · Practical execution sequence</text><text x="40" y="92" font-size="19">${esc(L.shortTitle)} · local operation · no provider inference</text><rect x="50" y="125" width="240" height="55" rx="12" fill="#eaf5ff" stroke="#bddaf8"/><text x="170" y="160" text-anchor="middle" font-size="22" font-weight="700">Student browser</text><rect x="870" y="125" width="350" height="55" rx="12" fill="#f1ebff" stroke="#d4c6f6"/><text x="1045" y="160" text-anchor="middle" font-size="22" font-weight="700">Host + lesson implementation</text><path d="M170 190V${svgHeight - 50}M1045 190V${svgHeight - 50}" stroke="#bbcde0" stroke-dasharray="7 7" stroke-width="2"/>${L.workflow.map((step, index) => { const y = 245 + index * 125; const reverse = index === L.workflow.length - 1; return `<text x="350" y="${y - 22}" font-size="22">${index + 1}. ${esc(step)}</text><path d="M${reverse ? 1045 : 170} ${y}H${reverse ? 170 : 1045}" stroke="#087fff" stroke-width="2" marker-end="url(#arrow)"/>`; }).join("")}</g></svg>\n`;
  return { "index.html": index, "learn.html": learn, "run.html": run, "walkthrough.html": walkthrough, "architecture.html": architecture, "architecture.svg": svg };
}
export async function buildReadme() {
  const fence = "```";
  const snippet = (value: string, language = "powershell") => `${fence}${language}\n${value}\n${fence}`;
  const packageJson = JSON.parse(await readFile(new URL("package.json", ROOT), "utf8")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const dependencyRows = Object.entries(packageJson.dependencies).map(([name, version]) => `| ${name} | ${version} |`).join("\n");
  return `# Mastra · Lesson ${number} · ${L.title}

${L.description}

![Lesson ${number} application](docs/application-preview.png)

## What this application does

${L.labDescription}

**Practical mode:** ${L.localMode}.

${L.scope}

## Run the application

Use **Node.js 24+**. Each lesson is an independent repository with its own dependency lockfile.

${snippet(`git clone ${repository}.git\ncd Udemy-Mastra-lesson${number}-app\nnpm ci\nnpm start`)}

Open **http://127.0.0.1:${3200 + L.number}** and choose **Run practical lab**. The practical operation requires no model key. Starting the server does not make a provider request. Keep the terminal open; Ctrl+C stops it. To change the port, set PORT in the environment or local .env file.

## Application pages

| Page | Content |
| --- | --- |
| Application lab | Editable JSON cases, actual execution, formatted result, event log and structured metadata |
| What you will learn | Lesson objectives, comprehension checks and a concrete exercise |
| How to run | Installation, local/live modes, commands and troubleshooting |
| Architecture & workflow | The practical execution sequence and the actual request runner |
| Code walkthrough | Source-derived excerpts with GitHub line references |

The application supports light/dark themes, mobile layouts, sanitized Markdown, syntax-highlighted code and copy-code controls.

## Practical execution workflow

| Stage | Source | Actual behavior |
| --- | --- | --- |
${L.readmeWorkflow.map(item => `| ${item.step} | [${item.component}](${item.component}) | ${item.behavior} |`).join("\n")}

The browser posts JSON to **POST /api/lab**. The host validates the envelope, runs the lesson implementation and sends NDJSON events. The UI renders the actual result and a separate application outcome. **GET /api/config** exposes public lesson metadata and credential-presence readiness, never credential values.

## Classroom cases and expected outcomes

${L.examples.map((item, index) => `### ${index + 1}. ${item.name}\n\n${snippet(JSON.stringify(item.input, null, 2), "json")}\n\n**Expected:** ${item.expected}`).join("\n\n")}

## Interpreting the result

${L.outcomeNotes.map(note => `- ${note}`).join("\n")}

**Complete** means the operation met its implemented completion checks. **Needs attention** exposes a business, format or validation finding. **Could not finish** is an execution/request failure. **Cancelled** is a separate user action. Read the evidence before treating any runtime status as task correctness.

## Optional live-agent workflow

${L.liveWorkflow.map((step, index) => `${index + 1}. ${step}`).join("\n")}

The live button uses **POST /api/query** and a real provider, and may incur API usage. Tests use an explicit SDK model adapter; no paid provider call is claimed by the test evidence.

Configure your own credentials locally, preserving any existing .env:

${snippet('if (!(Test-Path .env)) { Copy-Item .env.example .env }\nnotepad .env')}

${snippet((await readFile(new URL(".env.example", ROOT), "utf8")).trim(), "dotenv")}

Choose a model your account can access and restart the server. Credentials remain on the host and are ignored by Git. Existing shell values take precedence over the optional .env file. Provider/model availability and supported parameters must be checked for your selected model.
${[3, 8].includes(L.number) ? `
## Mastra Studio

${snippet("npm run studio")}

This executes the pinned Mastra CLI with **mastra dev**. The exported Mastra instance in **src/mastra/index.ts** configures **server.port=${4200 + L.number}**; follow the URL printed by the running CLI. Studio runs separately from the student application. ${L.number === 8 ? 'Local trace data is stored under the ignored .mastra directory. No external telemetry exporter is configured.' : 'The bootstrap tutor is available through the actual registry.'}
` : ""}
## Build, samples and verification

${snippet('npm run sample\nnpm run build\nnpm test\nnpm run test:browser')}

- **sample:** executes the default practical case without a provider key.
- **sample:live:** runs an actual provider request after configuration; invoke separately with npm run sample:live.
- **build:** regenerates all five pages, actual-source excerpts, architecture SVG, this README and the browser bundle.
- **test:** typechecks and runs offline local-operation, invalid-input, cancellation, real-SDK adapter, generated-content and HTTP-boundary checks, plus lesson-specific regression cases.
- **test:browser:** uses isolated headless Chrome to execute the real practical lab and its failure case, verify all five pages and mobile layout, check theme persistence, syntax colors and safe Markdown, and save [browser evidence](docs/browser-qa.json). The live-renderer fixture makes no provider request.${L.number === 10 ? ' It also checks partial streaming failure and Stop.' : ''}

Set BROWSER_EXECUTABLE if Chrome/Chromium is not installed at the platform’s standard path. Browser tests are local; GitHub Actions runs npm ci, build and the offline test suite.

## Dependencies

| Runtime package | Pinned version |
| --- | --- |
${dependencyRows}
${[3, 8].includes(L.number) ? `\nThe Studio CLI is pinned to **mastra ${packageJson.devDependencies.mastra}**.\n` : ""}
The committed package-lock.json fixes the installed dependency tree. A remote model alias is independent of the JavaScript lockfile.

## Student exercise

${L.exercise}

Rebuild after a source change so the explanation pages, line references and README remain consistent with the running code.

## Source and references

${L.sourceFiles.map(path => `- [${path}](${path})`).join("\n")}
- [HTTP host](src/server.ts)
- [Execution envelope](src/runner.ts)
- [Page and README generator](scripts/build-pages.ts)
${L.docs.map(item => `- [${item.title}](${item.url})`).join("\n")}

Prism’s license is included in [public/prism-LICENSE.txt](public/prism-LICENSE.txt).
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  for (const [name, content] of Object.entries(await buildPages())) await writeFile(new URL(`public/${name}`, ROOT), content);
  await writeFile(new URL("README.md", ROOT), await buildReadme());
  console.log(`Built Lesson ${number}: five pages, actual-source excerpts, sequence SVG and README.`);
}
