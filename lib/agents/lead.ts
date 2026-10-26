import { z } from "zod";
import { completeJson } from "../llm";
import { baseResult } from "./meta";
import { LEAD_PROMPT, withLanguage } from "./prompts";
import type { AgentModule } from "./types";

const rationaleSchema = z.object({ rationale: z.string().min(1).max(1600) });

export const leadBot: AgentModule = {
  id: "lead",
  mvp: true,
  systemPrompt: LEAD_PROMPT,
  async run(ctx) {
    const decision = ctx.decision;
    if (!decision) throw new Error("Lead Bot requires a decision.");
    let summaryText: string | undefined;
    try {
      const live = await completeJson(
        {
          bot: "lead",
          temperature: 0.3,
          json: true,
          messages: [
            { role: "system", content: withLanguage(LEAD_PROMPT, ctx.locale) },
            {
              role: "user",
              content: JSON.stringify({
                userRequest: ctx.userRequest,
                ready: decision.ready,
                errorCount: decision.errorCount,
                warningCount: decision.warningCount,
                findings: (ctx.findings ?? [])
                  .filter((finding) => finding.status === "fail")
                  .slice(0, 20)
                  .map((finding) => ({
                    file: finding.file,
                    severity: finding.severity,
                    code: finding.code,
                    params: finding.params,
                  })),
              }),
            },
          ],
        },
        { rationale: "" },
        (raw) => rationaleSchema.parse(raw),
      );
      if (live.meta.mode === "live") summaryText = live.data.rationale.trim();
    } catch {
      summaryText = undefined;
    }
    return baseResult("lead", "done", true, {
      summaryKey: decision.rationaleKey,
      summaryParams: decision.rationaleParams,
      summaryText,
      summaryLocale: summaryText ? ctx.locale : undefined,
    });
  },
};
