import type {
  BotId,
  BotRunResult,
  Decision,
  Finding,
  Locale,
  ParsedFile,
  ValidationRule,
} from "../types";

export interface RunContext {
  locale: Locale;
  userRequest: string;
  files: ParsedFile[];
  rules: ValidationRule[];
  findings?: Finding[];
  decision?: Decision;
  includeOptional: boolean;
}

export interface AgentModule {
  id: BotId;
  /** False marks a stub that is wired through the GUI but does not check yet. */
  mvp: boolean;
  systemPrompt: string;
  run: (ctx: RunContext) => Promise<BotRunResult>;
}
