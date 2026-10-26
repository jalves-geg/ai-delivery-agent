import { agentById } from "./agents/registry";
import { decide } from "./checks/engine";
import type { Decision, Finding, Locale, ParsedFile, ValidationRule } from "./types";
import type { BotRunResult } from "./types";

export interface RunInput {
  locale: Locale;
  userRequest: string;
  files: ParsedFile[];
  rules: ValidationRule[];
  includeOptional: boolean;
}

export interface RunResponse {
  findings: Finding[];
  decision: Decision;
  bots: BotRunResult[];
}

export async function runPipeline(input: RunInput): Promise<RunResponse> {
  const ctx = {
    locale: input.locale,
    userRequest: input.userRequest,
    files: input.files,
    rules: input.rules,
    includeOptional: input.includeOptional,
  };
  const processResult = await agentById("process-qa").run(ctx);
  const drawingResult = await agentById("drawing-qa").run(ctx);
  const specificationsResult = await agentById("specifications").run(ctx);
  const findings = [
    ...processResult.findings,
    ...drawingResult.findings,
    ...specificationsResult.findings,
  ];
  const decision = decide(findings);
  const leadResult = await agentById("lead").run({ ...ctx, findings, decision });
  if (leadResult.summaryText && leadResult.summaryLocale) {
    decision.rationaleText = leadResult.summaryText;
    decision.rationaleLocale = leadResult.summaryLocale;
  }
  const submissionResult = await agentById("submission").run({ ...ctx, findings, decision });
  return {
    findings,
    decision,
    bots: [processResult, drawingResult, specificationsResult, leadResult, submissionResult],
  };
}
