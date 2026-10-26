import { getLlmConfig } from "../llm";
import type { BotId, BotRunResult, BotStateName } from "../types";

export function withModel(result: BotRunResult, bot: BotId): BotRunResult {
  const config = getLlmConfig();
  return {
    ...result,
    model: config.mode === "mock" ? "demo" : config.models[bot],
    provider: config.mode === "mock" ? "mock" : config.provider,
    mode: config.mode,
  };
}

export function baseResult(
  bot: BotId,
  state: BotStateName,
  mvp: boolean,
  extra: Partial<BotRunResult> = {},
): BotRunResult {
  return withModel(
    {
      bot,
      state,
      mvp,
      findings: [],
      ...extra,
    },
    bot,
  );
}
