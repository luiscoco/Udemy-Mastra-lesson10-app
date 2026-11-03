import { Mastra } from "@mastra/core/mastra";
import { tutor } from "./agents.js";
export const mastra = new Mastra({ agents: { tutor: tutor } });
