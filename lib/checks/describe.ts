import { t, type MessageKey } from "../i18n";
import type { Check, Finding, Locale } from "../types";

export function describeCheck(check: Check, locale: Locale): string {
  const scope = (value: "drawings" | "all") =>
    t(locale, value === "drawings" ? "rules.appliesDrawings" : "rules.appliesAll");
  switch (check.type) {
    case "filename_regex":
      return t(locale, "check.filename_regex", {
        pattern: check.pattern,
        scope: scope(check.appliesTo),
      });
    case "required_filenames":
      return t(locale, "check.required_filenames", { files: check.filenames.join(", ") });
    case "allowed_extensions":
      return t(locale, "check.allowed_extensions", {
        extensions: check.extensions.join(", "),
        scope: scope(check.appliesTo),
      });
    case "forbid_tokens":
      return t(locale, "check.forbid_tokens", {
        tokens: check.tokens.join(", "),
        scope: scope(check.appliesTo),
      });
    case "revision_regex":
      return t(locale, "check.revision_regex", {
        pattern: check.pattern,
        scope: scope(check.appliesTo),
      });
    case "transmittal_match":
      return t(locale, "check.transmittal_match");
    default: {
      const _exhaustive: never = check;
      return String(_exhaustive);
    }
  }
}

export function categoryKey(category: string): MessageKey {
  return `rules.category.${category}` as MessageKey;
}

export function explainFinding(locale: Locale, finding: Pick<Finding, "code" | "params">): string {
  const params = { ...finding.params };
  if (params.scope === "drawings") params.scope = t(locale, "rules.appliesDrawings");
  if (params.scope === "all") params.scope = t(locale, "rules.appliesAll");
  return t(locale, finding.code, params);
}
