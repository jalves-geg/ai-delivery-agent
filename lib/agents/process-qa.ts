import { z } from "zod";
import { decide, runChecks } from "../checks/engine";
import { t } from "../i18n";
import { completeJson } from "../llm";
import { PROCESS_CATEGORIES, type Finding } from "../types";
import { baseResult } from "./meta";
import { PROCESS_QA_PROMPT, withLanguage } from "./prompts";
import type { AgentModule, RunContext } from "./types";

const summarySchema = z.object({ summary: z.string().min(1).max(1200) });

export const processQa: AgentModule = {
  id: "process-qa",
  mvp: true,
  systemPrompt: PROCESS_QA_PROMPT,
  async run(ctx) {
    const approved = ctx.rules.filter(
      (rule) => rule.status === "approved" && (PROCESS_CATEGORIES as readonly string[]).includes(rule.category),
    );
    const findings = runChecks(ctx.files, ctx.rules);
    const decision = decide(findings);
    const packageFiles = ctx.files.filter((file) => file.role !== "rules").length;
    const summaryParams = {
      files: String(packageFiles),
      rules: String(approved.length),
      errors: String(decision.errorCount),
      warnings: String(decision.warningCount),
      passes: String(decision.passCount),
    };
    let summaryText: string | undefined;
    let summaryLocale = ctx.locale;
    try {
      const live = await completeJson(
        {
          bot: "process-qa",
          temperature: 0.2,
          json: true,
          messages: [
            { role: "system", content: withLanguage(PROCESS_QA_PROMPT, ctx.locale) },
            {
              role: "user",
              content: JSON.stringify({
                userRequest: ctx.userRequest,
                findings: findings.map(compactFinding),
              }),
            },
          ],
        },
        { summary: "" },
        (raw) => summarySchema.parse(raw),
      );
      if (live.meta.mode === "live" && live.data.summary.trim()) {
        summaryText = live.data.summary.trim();
      }
    } catch {
      summaryText = undefined;
      summaryLocale = ctx.locale;
    }
    return baseResult("process-qa", "done", true, {
      findings,
      summaryKey: "summary.process",
      summaryParams,
      summaryText,
      summaryLocale: summaryText ? summaryLocale : undefined,
    });
  },
};

function compactFinding(finding: Finding) {
  return {
    file: finding.file,
    status: finding.status,
    severity: finding.severity,
    code: finding.code,
    params: finding.params,
    rule: finding.ruleTitle.en,
    source: finding.sourceDocument,
  };
}

export function processSummary(ctx: RunContext, findings: Finding[]): string {
  const decision = decide(findings);
  return t(ctx.locale, "summary.process", {
    files: String(ctx.files.filter((file) => file.role !== "rules").length),
    rules: String(ctx.rules.filter((rule) => rule.status === "approved").length),
    errors: String(decision.errorCount),
    warnings: String(decision.warningCount),
    passes: String(decision.passCount),
  });
}
