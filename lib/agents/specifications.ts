import { baseResult } from "./meta";
import { SPECIFICATIONS_PROMPT } from "./prompts";
import type { AgentModule } from "./types";

/**
 * Specifications Bot — stub.
 *
 * Intended work: narratives, specifications and technical documentation.
 * The orchestrator, GUI card, language strings and LLM_MODEL_SPECIFICATIONS slot already exist.
 *
 * To implement:
 * 1. Set `mvp` to true.
 * 2. Replace `run`. Narrative files arrive on `ctx.files` with role "narrative".
 * 3. Return findings for approved rules whose category is "specification".
 * 4. Keep human-readable text in `ctx.locale`.
 */
export const specificationsBot: AgentModule = {
  id: "specifications",
  mvp: false,
  systemPrompt: SPECIFICATIONS_PROMPT,
  async run(ctx) {
    const waiting = ctx.rules.filter(
      (rule) => rule.status === "approved" && rule.category === "specification",
    ).length;
    if (!ctx.includeOptional) {
      return baseResult("specifications", "skipped", false, {
        summaryKey: "bots.specifications.skipped",
      });
    }
    return baseResult("specifications", "stub", false, {
      summaryKey: "bots.specifications.stubSummary",
      summaryParams: { count: String(waiting) },
    });
  },
};
