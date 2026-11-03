import { z } from "zod";
import { createTutor } from "./mastra/agents.js";
import { delay, mayRetry } from "./mastra/retries.js";
import { assertActive, modelId, type AgentModel, type Emit, type LabResult } from "./core.js";
export const inputSchema = z.object({ scenario: z.enum(["success", "transient-before-text", "partial-failure", "permanent-before-text"]), chunkDelayMs: z.number().int().min(10).max(500), maxAttempts: z.number().int().min(1).max(2) }).strict();
const fixtureChunks = ["## Local streaming fixture\\n\\n", "This text is a deterministic classroom fixture, ", "not a model response.\\n\\n", "```typescript\\n", "const completed = true;\\n", "```"] .map(text => text.replaceAll("\\n", "\n"));
export async function executeLab(raw: unknown, emit: Emit, signal: AbortSignal): Promise<LabResult> {
  const input = inputSchema.parse(raw); let text = ""; let attempts = 0; let completed = false;
  while (attempts < input.maxAttempts) {
    attempts++; assertActive(signal);
    emit({ type: "stage", text: `Fixture attempt ${attempts}: real timed HTTP events; no model call.` });
    try {
      if (input.scenario === "permanent-before-text") throw Object.assign(new Error("Fixture validation failure"), { statusCode: 400 });
      if (input.scenario === "transient-before-text" && attempts === 1) throw Object.assign(new Error("Fixture service unavailable"), { statusCode: 503 });
      for (let i = 0; i < fixtureChunks.length; i++) {
        await delay(input.chunkDelayMs, signal);
        if (input.scenario === "partial-failure" && i === 2) throw Object.assign(new Error("Fixture interrupted"), { statusCode: 503 });
        text += fixtureChunks[i]; emit({ type: "delta", text: fixtureChunks[i] });
      }
      completed = true; break;
    } catch (error) {
      assertActive(signal);
      if (mayRetry(error, attempts, input.maxAttempts, text.length, signal)) { emit({ type: "stage", text: "Transient failure before text: bounded retry permitted." }); await delay(100, signal); continue; }
      emit({ type: "stage", text: text ? "Partial output retained. Automatic retry blocked after visible text." : "Run failed before text; no eligible retry remains." }); break;
    }
  }
  return { streamed: true, status: completed ? "pass" : "needs-attention", summary: completed ? "The labelled local fixture completed." : "The fixture failed. Partial text is not a successful completion.", data: { fixture: true, modelCalled: false, attempts, visibleCharacters: text.length, completed, autoRetryAfterText: false } };
}
export const liveModel = (_?: unknown) => modelId();
export async function executeLive(raw: unknown, question: string, emit: Emit, signal: AbortSignal, model?: AgentModel) {
  const input = inputSchema.parse(raw); let text = ""; let attempts = 0;
  // The agent sets maxRetries: 0 so this application owns the retry boundary.
  const agent = createTutor(model);
  while (attempts < input.maxAttempts) {
    attempts++; assertActive(signal);
    emit({ type: "stage", text: `Real Agent.stream() attempt ${attempts}. Fixture scenario is ignored for live generation.` });
    try {
      const response = await agent.stream(question, { maxSteps: 3, abortSignal: signal, modelSettings: { maxOutputTokens: 1400 } });
      for await (const chunk of response.textStream) { assertActive(signal); text += chunk; emit({ type: "delta", text: chunk }); }
      const full = await response.getFullOutput(); if (full.error) throw full.error;
      return { finished: full.finishReason === "stop" && text.trim().length > 0, steps: full.steps.length, details: { attempts, visibleCharacters: text.length, finishReason: full.finishReason, fixture: false } };
    } catch (error) {
      assertActive(signal);
      if (mayRetry(error, attempts, input.maxAttempts, text.length, signal)) { emit({ type: "stage", text: "Transient failure before text: retrying once." }); await delay(250, signal); continue; }
      return { finished: false, steps: 0, details: { attempts, visibleCharacters: text.length, partial: text.length > 0, fixture: false, retryEligible: false } };
    }
  }
  return { finished: false, steps: 0, details: { attempts, fixture: false } };
}
export async function dispose() {}
