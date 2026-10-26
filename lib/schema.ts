import { z } from "zod";

export const l10nSchema = z.object({
  en: z.string(),
  pt: z.string().optional(),
});

export const checkSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("filename_regex"),
    pattern: z.string().min(1).max(180),
    appliesTo: z.enum(["drawings", "all"]),
  }),
  z.object({
    type: z.literal("required_filenames"),
    filenames: z.array(z.string().min(1).max(180)).min(1).max(40),
  }),
  z.object({
    type: z.literal("allowed_extensions"),
    extensions: z.array(z.string().min(1).max(12)).min(1).max(12),
    appliesTo: z.enum(["drawings", "all"]),
  }),
  z.object({
    type: z.literal("forbid_tokens"),
    tokens: z.array(z.string().min(1).max(40)).min(1).max(20),
    appliesTo: z.enum(["drawings", "all"]),
  }),
  z.object({
    type: z.literal("revision_regex"),
    pattern: z.string().min(1).max(180),
    appliesTo: z.enum(["drawings", "all"]),
  }),
  z.object({
    type: z.literal("transmittal_match"),
  }),
]);

export const ruleSchema = z.object({
  id: z.string().min(1).max(80),
  category: z.enum([
    "naming",
    "files",
    "revisions",
    "format",
    "drawing",
    "specification",
  ]),
  severity: z.enum(["error", "warning"]),
  title: l10nSchema,
  description: l10nSchema,
  source: z.object({
    document: z.string().min(1).max(180),
    excerpt: l10nSchema,
  }),
  check: checkSchema,
  status: z.enum(["proposed", "approved", "rejected"]),
  edited: z.boolean(),
  titleOverride: z.string().max(240).optional(),
  descriptionOverride: z.string().max(2000).optional(),
});

export const parsedFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(240),
  role: z.enum(["rules", "drawing", "transmittal", "narrative", "image", "other"]),
  extension: z.string().max(12),
  mime: z.string().max(120),
  size: z.number().nonnegative(),
  text: z.string().max(30_000),
  origin: z.enum(["sample", "upload"]),
  dataUrl: z.string().max(500_000).optional(),
  parseWarning: z.string().max(300).optional(),
});

export const findingSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  bot: z.enum([
    "requirements",
    "process-qa",
    "drawing-qa",
    "specifications",
    "lead",
    "submission",
  ]),
  severity: z.enum(["error", "warning", "info"]),
  status: z.enum(["pass", "fail"]),
  code: z.string(),
  params: z.record(z.string(), z.string()),
  file: z.string().optional(),
  sourceDocument: z.string(),
  sourceExcerpt: l10nSchema,
  ruleTitle: l10nSchema,
});

export const decisionSchema = z.object({
  ready: z.boolean(),
  errorCount: z.number(),
  warningCount: z.number(),
  passCount: z.number(),
  rationaleKey: z.string(),
  rationaleParams: z.record(z.string(), z.string()),
  rationaleText: z.string().optional(),
  rationaleLocale: z.enum(["en", "pt"]).optional(),
  blockers: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const botStateSchema = z.object({
  bot: z.enum([
    "requirements",
    "process-qa",
    "drawing-qa",
    "specifications",
    "lead",
    "submission",
  ]),
  state: z.enum(["idle", "running", "done", "skipped", "stub", "error"]),
});

export function modelRuleSchema() {
  return z.object({
    id: z.string().min(1).max(80).optional(),
    category: ruleSchema.shape.category,
    severity: ruleSchema.shape.severity,
    title: z.string().min(1).max(240),
    description: z.string().min(1).max(2000),
    source: z.object({
      document: z.string().min(1).max(180),
      excerpt: z.string().min(1).max(400),
    }),
    check: checkSchema,
  });
}
