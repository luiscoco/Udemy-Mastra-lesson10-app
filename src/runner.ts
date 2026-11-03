import { performance } from "node:perf_hooks";
import { LESSON } from "./lesson.js";
import { executeLab, executeLive, liveModel } from "./lab.js";
import { assertActive, credentialReady, modelId, resultMarkdown, type AgentModel, type Emit } from "./core.js";

export function liveConfiguration(input?: unknown) {
  let model = modelId();
  try { model = liveModel(input); } catch { /* Invalid inputs are reported by the actual lab schema. */ }
  return { model, ready: credentialReady(model) };
}
export async function runLesson(mode: "lab" | "live", input: unknown, question: string, emit: Emit,
  signal: AbortSignal, testModel?: AgentModel) {
  assertActive(signal);
  const started = performance.now();
  emit({ type: "started", mode, text: mode === "lab" ? LESSON.localMode : "A real Mastra agent run was requested." });
  if (mode === "lab") {
    const result = await executeLab(input, emit, signal);
    assertActive(signal);
    if (!result.streamed) emit({ type: "answer", text: resultMarkdown(result) });
    const config = liveConfiguration(input);
    emit({ type: "result", status: result.status, text: result.summary, data: result.data,
      durationMs: Math.round(performance.now() - started), modelSteps: 0, liveReady: config.ready, model: config.model });
    return result;
  }
  const result = await executeLive(input, question, emit, signal, testModel);
  emit({ type: "result", status: result.finished ? "pass" : "needs-attention", modelSteps: result.steps,
    text: result.finished ? "The generation finished. Check its content against the task and source evidence."
      : "The run did not meet its completion checks. Inspect the response, evidence and limits.",
    durationMs: Math.round(performance.now() - started), data: result.details });
  return result;
}
