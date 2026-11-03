import { Agent } from "@mastra/core/agent";
import { z } from "zod";

export type AgentModel = ConstructorParameters<typeof Agent>[0]["model"];
export type Emit = (event: LabEvent) => void;
export type LabEvent = {
  type: "started" | "stage" | "delta" | "answer" | "result" | "error";
  text?: string; status?: "pass" | "needs-attention"; data?: unknown; mode?: string;
  durationMs?: number; modelSteps?: number; liveReady?: boolean; model?: string;
};
export type LabResult = { status: "pass" | "needs-attention"; summary: string; data: unknown; streamed?: boolean };
export type LessonMetadata = {
  number: number; title: string; shortTitle: string; eyebrow: string; hero: string; accent: string;
  description: string; labTitle: string; labDescription: string; localMode: string; defaultQuestion: string;
  objectives: { title: string; text: string }[]; workflow: string[]; scope: string;
  examples: { name: string; input: unknown; expected: string }[];
  sourceFiles: string[]; exercise: string; checks: { question: string; answer: string }[];
  readmeWorkflow: { step: string; component: string; behavior: string }[];
  liveWorkflow: string[]; outcomeNotes: string[];
  docs: { title: string; url: string }[];
};
export const requestSchema = z.object({ input: z.unknown(), question: z.string().trim().min(1).max(1500) }).strict();
export const MAX_STEPS = 3;
export const DEADLINE_MS = 90_000;
export function modelId(value = process.env.MASTRA_MODEL): `${string}/${string}` {
  const candidate = value?.trim() || "openai/gpt-4.1-mini";
  if (!/^(openai|anthropic|google)\/[a-zA-Z0-9._:-]+$/.test(candidate)) throw new Error("Use provider/model with an openai, anthropic or google provider.");
  return candidate as `${string}/${string}`;
}
export function credentialReady(model: string) {
  const variable = ({ openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", google: "GOOGLE_GENERATIVE_AI_API_KEY" } as Record<string, string>)[model.split("/")[0]];
  const value = variable ? process.env[variable]?.trim() : undefined;
  return Boolean(value && !/^(your_|replace|<)/i.test(value));
}
export function assertActive(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("The run was cancelled.", "AbortError");
}
export function makeAgent(id: string, name: string, instructions: string, override?: AgentModel) {
  return new Agent({ id, name, instructions, model: override || modelId() });
}
export async function generateAnswer(agent: Agent, question: string, emit: Emit, signal: AbortSignal,
  options: { maxOutputTokens?: number; temperature?: number } = {}) {
  assertActive(signal);
  emit({ type: "stage", text: "Calling the registered agent with generate(); the provider performs the model work." });
  const response = await agent.generate(question, { maxSteps: MAX_STEPS, abortSignal: signal,
    modelSettings: { maxOutputTokens: options.maxOutputTokens || 1200, ...(options.temperature === undefined ? {} : { temperature: options.temperature }) } });
  assertActive(signal);
  if (response.error) throw response.error;
  if (response.text) emit({ type: "answer", text: response.text });
  return { finished: response.finishReason === "stop" && response.text.trim().length > 0,
    text: response.text, steps: response.steps.length, finishReason: response.finishReason,
    toolCalls: response.toolCalls.length, details: { finishReason: response.finishReason, toolCalls: response.toolCalls.length } };
}
export function resultMarkdown(result: LabResult) {
  return `## ${result.status === "pass" ? "Practical result" : "Review the result"}\n\n${result.summary}\n\n\`\`\`json\n${JSON.stringify(result.data, null, 2)}\n\`\`\``;
}
