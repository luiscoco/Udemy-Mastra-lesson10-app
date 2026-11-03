import { Agent } from "@mastra/core/agent";
import { modelId, type AgentModel } from "../core.js";
export const instructions = "Explain streaming, cancellation and bounded retries accurately. Partial output is not a completed answer. Use Markdown with fenced TypeScript code.";
export function createTutor(model?: AgentModel) { return new Agent({ id: "lesson-10-tutor", name: "Lesson 10 tutor", instructions, model: model || modelId(), maxRetries: 0 }); }
export const tutor = createTutor();
