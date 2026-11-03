import { renderAnswer } from "./markdown.js";

type Example = { name: string; input: unknown; expected: string };
type Configuration = { ready: boolean; model: string; lesson: { localMode: string; examples: Example[] } };
type Event = { type: string; text?: string; mode?: string; status?: string; data?: unknown; durationMs?: number; modelSteps?: number; liveReady?: boolean; model?: string };
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = el<HTMLTextAreaElement>("lab-input");
const question = el<HTMLTextAreaElement>("question");
const labButton = el<HTMLButtonElement>("run-lab");
const liveButton = el<HTMLButtonElement>("run-live");
const stop = el<HTMLButtonElement>("stop");
const selector = el<HTMLSelectElement>("example");
const answer = el<HTMLDivElement>("answer");
const feedback = el<HTMLParagraphElement>("feedback");
const events = el<HTMLOListElement>("events");
let configuration: Configuration;
let busy = false;
let controller: AbortController | undefined;
let cancelled = false;
let text = "";
let eventCount = 0;
function controls(active: boolean) {
  busy = active; input.disabled = active; question.disabled = active; selector.disabled = active;
  labButton.disabled = active; liveButton.disabled = active || !configuration?.ready; stop.disabled = !active;
}
function log(title: string, body: string) {
  const row = document.createElement("li"); const name = document.createElement("strong"); const detail = document.createElement("span");
  name.textContent = title; detail.textContent = body; row.append(name, detail); events.append(row);
  el("event-count").textContent = String(++eventCount); events.scrollTop = events.scrollHeight;
}
function chooseExample() {
  const example = configuration.lesson.examples[Number(selector.value)];
  input.value = JSON.stringify(example.input, null, 2); el("expected").textContent = example.expected;
}
function handle(event: Event) {
  if (event.type === "started") { log("Request started", event.text || ""); el("run-status").textContent = "Running"; }
  if (event.type === "stage") log("Observed operation", event.text || "");
  if (event.type === "delta") { text += event.text || ""; renderAnswer(answer, text); }
  if (event.type === "answer") { text = event.text || ""; renderAnswer(answer, text); }
  if (event.type === "result") {
    el("run-status").textContent = event.status === "pass" ? "Complete" : "Needs attention";
    el("elapsed").textContent = `${((event.durationMs || 0) / 1000).toFixed(2)} s`;
    el("model-steps").textContent = String(event.modelSteps || 0);
    feedback.className = "meta"; feedback.textContent = event.text || "";
    if (event.data !== undefined) renderAnswer(el("result-data"), `\`\`\`json\n${JSON.stringify(event.data, null, 2)}\n\`\`\``);
    if (event.liveReady !== undefined) configuration.ready = event.liveReady;
    if (event.model) el("model-name").textContent = event.model;
    log("Application outcome", event.text || "");
  }
  if (event.type === "error") {
    el("run-status").textContent = "Could not finish"; feedback.className = "meta error"; feedback.textContent = event.text || "The operation failed.";
    if (event.data !== undefined) renderAnswer(el("result-data"), `\`\`\`json\n${JSON.stringify(event.data, null, 2)}\n\`\`\``);
    log("Failure boundary", feedback.textContent);
  }
}
async function run(mode: "lab" | "live") {
  if (busy) return;
  let candidate: unknown;
  try { candidate = JSON.parse(input.value); } catch {
    feedback.className = "meta error"; feedback.textContent = "Enter valid JSON in the practical input."; el("run-status").textContent = "Check input"; return;
  }
  if (!question.value.trim()) { feedback.textContent = "Enter a question for the optional live agent."; return; }
  text = ""; eventCount = 0; answer.replaceChildren(); answer.classList.remove("markdown-answer"); events.replaceChildren();
  el("result-data").replaceChildren(); feedback.textContent = ""; el("elapsed").textContent = "—"; el("model-steps").textContent = "0";
  el("run-mode").textContent = mode === "lab" ? "Practical lab · no model call" : "Live Mastra agent";
  controls(true); cancelled = false; controller = new AbortController(); el("run-status").textContent = "Connecting";
  try {
    const response = await fetch(mode === "lab" ? "/api/lab" : "/api/query", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: candidate, question: question.value.trim() }), signal: controller.signal });
    if (!response.ok) { const data = await response.json() as { error?: string }; throw new Error(data.error || "The request could not finish."); }
    if (!response.body) throw new Error("The server returned no event stream.");
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = ""; let terminal = false;
    const consume = (line: string) => { if (!line.trim()) return; const event = JSON.parse(line) as Event; handle(event); if (["result", "error"].includes(event.type)) terminal = true; };
    while (true) { const next = await reader.read(); if (next.done) break; pending += decoder.decode(next.value, { stream: true }); const lines = pending.split("\n"); pending = lines.pop() || ""; for (const line of lines) consume(line); }
    consume(pending + decoder.decode());
    if (!terminal) throw new Error("The connection ended without a final outcome. Partial text is not proof of completion.");
  } catch (error) {
    el("run-status").textContent = cancelled ? "Cancelled" : "Could not finish"; feedback.className = "meta error";
    feedback.textContent = cancelled ? "You stopped the run. Any partial text is preserved and is not a completed answer."
      : error instanceof Error ? error.message : "The operation could not finish.";
    log(cancelled ? "User cancellation" : "Request failure", feedback.textContent);
  } finally { controls(false); controller = undefined; }
}
selector.addEventListener("change", chooseExample);
labButton.addEventListener("click", () => void run("lab")); liveButton.addEventListener("click", () => void run("live"));
stop.addEventListener("click", () => { cancelled = true; controller?.abort(); });
void (async () => {
  try {
    const response = await fetch("/api/config"); if (!response.ok) throw new Error(); configuration = await response.json() as Configuration;
    selector.replaceChildren();
    configuration.lesson.examples.forEach((example, index) => { const option = document.createElement("option"); option.value = String(index); option.textContent = example.name; selector.append(option); });
    chooseExample(); el("model-name").textContent = configuration.model;
    el("provider-status").textContent = configuration.ready ? "Live provider configured" : "Practical lab ready · live key not configured";
    el("provider-status").classList.toggle("ready", configuration.ready);
    controls(false);
  } catch { feedback.textContent = "Start the local application with npm start, then reload this page."; labButton.disabled = true; liveButton.disabled = true; }
})();
