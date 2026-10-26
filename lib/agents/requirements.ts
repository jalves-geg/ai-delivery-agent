import { z } from "zod";
import { completeJson, LlmError } from "../llm";
import { modelRuleSchema } from "../schema";
import { corpusLooksLikeSample, sampleRules } from "../samples/rules";
import type { Locale, ParsedFile, ValidationRule } from "../types";
import { l10n } from "../types";
import type { AgentModule } from "./types";
import { REQUIREMENTS_PROMPT, withLanguage } from "./prompts";
import { getLlmConfig } from "../llm";

const responseSchema = z.object({
  rules: z.array(modelRuleSchema()).min(1).max(8),
});

export interface ProposeResult {
  rules: ValidationRule[];
  notice?: "demo_unrecognised";
  meta: { mode: "mock" | "live"; model: string; provider: string };
}

export const requirementsBot: AgentModule = {
  id: "requirements",
  mvp: true,
  systemPrompt: REQUIREMENTS_PROMPT,
  async run() {
    throw new Error("Use proposeRules() for the Requirements Bot.");
  },
};

export async function proposeRules(input: {
  files: ParsedFile[];
  userRequest: string;
  locale: Locale;
}): Promise<ProposeResult> {
  const config = getLlmConfig();
  const rulesDocs = input.files.filter((file) => file.role === "rules");
  const meta = {
    mode: config.mode,
    model: config.mode === "mock" ? "demo" : config.models.requirements,
    provider: config.mode === "mock" ? "mock" : config.provider,
  };

  if (config.mode === "mock") {
    const recognised = corpusLooksLikeSample(rulesDocs.map((file) => `${file.name}\n${file.text}`));
    if (!recognised) return { rules: [], notice: "demo_unrecognised", meta };
    return { rules: sampleRules(), meta };
  }

  const documents = (rulesDocs.length > 0 ? rulesDocs : input.files)
    .map((file) => `FILE: ${file.name}\n${file.text.slice(0, 8000)}`)
    .join("\n\n----\n\n");
  try {
    const { data } = await completeJson(
      {
        bot: "requirements",
        temperature: 0.2,
        json: true,
        messages: [
          { role: "system", content: withLanguage(REQUIREMENTS_PROMPT, input.locale) },
          {
            role: "user",
            content: `User request:\n${input.userRequest || "(none)"}\n\nDocuments:\n${documents}`,
          },
        ],
      },
      { rules: [] },
      (raw) => responseSchema.parse(raw),
    );
    const seen = new Set<string>();
    return {
      rules: data.rules.map((rule, index) => toRule(rule, input.locale, index, seen)),
      meta,
    };
  } catch (error) {
    const message = error instanceof LlmError ? error.message : "Requirements request failed.";
    throw new LlmError(message, { cause: error });
  }
}

function toRule(
  rule: z.infer<ReturnType<typeof modelRuleSchema>>,
  locale: Locale,
  index: number,
  seen: Set<string>,
): ValidationRule {
  const text = (value: string) => (locale === "pt" ? l10n(value, value) : { en: value });
  let id = (rule.id || `rule-${index + 1}`).replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 60);
  if (!id) id = `rule-${index + 1}`;
  if (seen.has(id)) id = `${id}-${index + 1}`;
  seen.add(id);
  return {
    id,
    category: rule.category,
    severity: rule.severity,
    title: text(rule.title),
    description: text(rule.description),
    source: {
      document: rule.source.document,
      excerpt: text(rule.source.excerpt.slice(0, 240)),
    },
    check: rule.check,
    status: "proposed",
    edited: false,
  };
}
