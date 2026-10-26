import type { BotId } from "../types";
import { drawingQa } from "./drawing-qa";
import { leadBot } from "./lead";
import { processQa } from "./process-qa";
import { requirementsBot } from "./requirements";
import { specificationsBot } from "./specifications";
import { submissionBot } from "./submission";
import type { AgentModule } from "./types";

export const agents: readonly AgentModule[] = [
  requirementsBot,
  processQa,
  drawingQa,
  specificationsBot,
  leadBot,
  submissionBot,
];

export function agentById(id: BotId): AgentModule {
  const found = agents.find((agent) => agent.id === id);
  if (!found) throw new Error(`Unknown bot: ${id}`);
  return found;
}
