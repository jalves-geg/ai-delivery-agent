import { baseResult } from "./meta";
import { DRAWING_QA_PROMPT } from "./prompts";
import type { AgentModule } from "./types";

/**
 * Drawing QA Bot — stub.
 *
 * Intended work: drawing content, consistency across sheets, dimensions and notes.
 * The orchestrator, GUI card, language strings and LLM_MODEL_DRAWING_QA slot already exist.
 *
 * To implement:
 * 1. Set `mvp` to true.
 * 2. Replace `run` with a real checker. Call `completeJson` from `@/lib/llm` when you want the model.
 * 3. Return findings for approved rules whose category is "drawing".
 * 4. Keep human-readable text in the requested locale (`ctx.locale`).
 */
export const drawingQa: AgentModule = {
  id: "drawing-qa",
  mvp: false,
  systemPrompt: DRAWING_QA_PROMPT,
  async run(ctx) {
    const waiting = ctx.rules.filter(
      (rule) => rule.status === "approved" && rule.category === "drawing",
    ).length;
    if (!ctx.includeOptional) {
      return baseResult("drawing-qa", "skipped", false, {
        summaryKey: "bots.drawingQa.skipped",
      });
    }
    return baseResult("drawing-qa", "stub", false, {
      summaryKey: "bots.drawingQa.stubSummary",
      summaryParams: { count: String(waiting) },
    });
  },
};
