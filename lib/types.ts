export const LOCALES = ["en", "pt"] as const;
export type Locale = (typeof LOCALES)[number];

export const BOT_IDS = [
  "requirements",
  "process-qa",
  "drawing-qa",
  "specifications",
  "lead",
  "submission",
] as const;
export type BotId = (typeof BOT_IDS)[number];

export const FILE_ROLES = [
  "rules",
  "drawing",
  "transmittal",
  "narrative",
  "image",
  "other",
] as const;
export type FileRole = (typeof FILE_ROLES)[number];

export const RULE_CATEGORIES = [
  "naming",
  "files",
  "revisions",
  "format",
  "drawing",
  "specification",
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const PROCESS_CATEGORIES = [
  "naming",
  "files",
  "revisions",
  "format",
] as const satisfies readonly RuleCategory[];

export type RuleSeverity = "error" | "warning";
export type RuleStatus = "proposed" | "approved" | "rejected";
export type BotStateName =
  | "idle"
  | "running"
  | "done"
  | "skipped"
  | "stub"
  | "error";

export type L10n = { en: string; pt?: string };

export type Check =
  | { type: "filename_regex"; pattern: string; appliesTo: "drawings" | "all" }
  | { type: "required_filenames"; filenames: string[] }
  | {
      type: "allowed_extensions";
      extensions: string[];
      appliesTo: "drawings" | "all";
    }
  | { type: "forbid_tokens"; tokens: string[]; appliesTo: "drawings" | "all" }
  | { type: "revision_regex"; pattern: string; appliesTo: "drawings" | "all" }
  | { type: "transmittal_match" };

export interface ValidationRule {
  id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  title: L10n;
  description: L10n;
  source: { document: string; excerpt: L10n };
  check: Check;
  status: RuleStatus;
  edited: boolean;
  titleOverride?: string;
  descriptionOverride?: string;
}

export interface ParsedFile {
  id: string;
  name: string;
  role: FileRole;
  extension: string;
  mime: string;
  size: number;
  text: string;
  origin: "sample" | "upload";
  dataUrl?: string;
  parseWarning?: string;
}

export type FindingCode =
  | "finding.filename_mismatch"
  | "finding.filename_ok"
  | "finding.missing_file"
  | "finding.file_present"
  | "finding.bad_extension"
  | "finding.extension_ok"
  | "finding.forbidden_token"
  | "finding.tokens_ok"
  | "finding.revision_mismatch"
  | "finding.revision_ok"
  | "finding.transmittal_missing_from_package"
  | "finding.transmittal_missing_from_list"
  | "finding.transmittal_ok"
  | "finding.transmittal_absent"
  | "finding.no_scoped_files"
  | "finding.invalid_regex";

export interface Finding {
  id: string;
  ruleId: string;
  bot: BotId;
  severity: RuleSeverity | "info";
  status: "pass" | "fail";
  code: FindingCode;
  params: Record<string, string>;
  file?: string;
  sourceDocument: string;
  sourceExcerpt: L10n;
  ruleTitle: L10n;
}

export interface BotRunResult {
  bot: BotId;
  state: BotStateName;
  mvp: boolean;
  summaryKey?: string;
  summaryParams?: Record<string, string>;
  summaryText?: string;
  summaryLocale?: Locale;
  findings: Finding[];
  model?: string;
  provider?: string;
  mode?: "mock" | "live";
  error?: string;
}

export interface Decision {
  ready: boolean;
  errorCount: number;
  warningCount: number;
  passCount: number;
  rationaleKey: string;
  rationaleParams: Record<string, string>;
  rationaleText?: string;
  rationaleLocale?: Locale;
  blockers: string[];
  warnings: string[];
}

export type StepId =
  | "receive"
  | "approve"
  | "distribute"
  | "consolidate"
  | "decide";

export interface ProjectInfo {
  name: L10n;
  code: string;
  client: string;
  originator: string;
  stage: L10n;
}

export function l10n(en: string, pt: string): L10n {
  return { en, pt };
}

export function pick(value: L10n | undefined, locale: Locale): string {
  if (!value) return "";
  if (locale === "pt" && value.pt && value.pt.trim()) return value.pt;
  return value.en;
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "pt";
}
