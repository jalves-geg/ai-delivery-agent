import type {
  Check,
  Decision,
  Finding,
  FindingCode,
  ParsedFile,
  ValidationRule,
} from "../types";

const FILENAME_IN_TEXT = /[A-Za-z0-9][A-Za-z0-9_.()\-]*\.[A-Za-z0-9]{2,5}/g;

export function runChecks(files: ParsedFile[], rules: ValidationRule[]): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (rule.status !== "approved") continue;
    if (!isProcessRule(rule)) continue;
    findings.push(...checkRule(files, rule));
  }
  return findings;
}

function isProcessRule(rule: ValidationRule): boolean {
  return (
    rule.category === "naming" ||
    rule.category === "files" ||
    rule.category === "revisions" ||
    rule.category === "format"
  );
}

function checkRule(files: ParsedFile[], rule: ValidationRule): Finding[] {
  const check = rule.check;
  switch (check.type) {
    case "filename_regex":
    case "revision_regex":
      return regexFindings(files, rule, check);
    case "allowed_extensions":
      return extensionFindings(files, rule, check);
    case "forbid_tokens":
      return tokenFindings(files, rule, check);
    case "required_filenames":
      return requiredFindings(files, rule, check.filenames);
    case "transmittal_match":
      return transmittalFindings(files, rule);
    default: {
      const _exhaustive: never = check;
      return _exhaustive;
    }
  }
}

function regexFindings(
  files: ParsedFile[],
  rule: ValidationRule,
  check: Extract<Check, { type: "filename_regex" | "revision_regex" }>,
): Finding[] {
  let expression: RegExp;
  try {
    expression = new RegExp(check.pattern);
  } catch {
    return [
      makeFinding(rule, {
        code: "finding.invalid_regex",
        status: "fail",
        params: { pattern: check.pattern },
      }),
    ];
  }
  const scoped = scopeFiles(files, check.appliesTo);
  if (scoped.length === 0) {
    return [
      makeFinding(rule, {
        code: "finding.no_scoped_files",
        status: "fail",
        params: { scope: check.appliesTo },
      }),
    ];
  }
  const failCode: FindingCode =
    check.type === "filename_regex" ? "finding.filename_mismatch" : "finding.revision_mismatch";
  const passCode: FindingCode =
    check.type === "filename_regex" ? "finding.filename_ok" : "finding.revision_ok";
  return scoped.map((file) =>
    expression.test(file.name)
      ? makeFinding(rule, {
          code: passCode,
          status: "pass",
          file: file.name,
          params: { file: file.name, pattern: check.pattern },
        })
      : makeFinding(rule, {
          code: failCode,
          status: "fail",
          file: file.name,
          params: { file: file.name, pattern: check.pattern },
        }),
  );
}

function extensionFindings(
  files: ParsedFile[],
  rule: ValidationRule,
  check: Extract<Check, { type: "allowed_extensions" }>,
): Finding[] {
  const allowed = check.extensions.map((item) => item.toLowerCase().replace(/^\./, ""));
  const scoped = scopeFiles(files, check.appliesTo);
  if (scoped.length === 0) {
    return [
      makeFinding(rule, {
        code: "finding.no_scoped_files",
        status: "fail",
        params: { scope: check.appliesTo },
      }),
    ];
  }
  return scoped.map((file) => {
    const extension = file.extension.toLowerCase();
    const params = { file: file.name, extension, allowed: allowed.join(", ") };
    return allowed.includes(extension)
      ? makeFinding(rule, {
          code: "finding.extension_ok",
          status: "pass",
          file: file.name,
          params,
        })
      : makeFinding(rule, {
          code: "finding.bad_extension",
          status: "fail",
          file: file.name,
          params,
        });
  });
}

function tokenFindings(
  files: ParsedFile[],
  rule: ValidationRule,
  check: Extract<Check, { type: "forbid_tokens" }>,
): Finding[] {
  const scoped = scopeFiles(files, check.appliesTo);
  if (scoped.length === 0) {
    return [
      makeFinding(rule, {
        code: "finding.no_scoped_files",
        status: "fail",
        params: { scope: check.appliesTo },
      }),
    ];
  }
  return scoped.map((file) => {
    const haystack = file.name.toLowerCase();
    const hit = check.tokens.find((token) => haystack.includes(token.toLowerCase()));
    return hit
      ? makeFinding(rule, {
          code: "finding.forbidden_token",
          status: "fail",
          file: file.name,
          params: { file: file.name, token: hit },
        })
      : makeFinding(rule, {
          code: "finding.tokens_ok",
          status: "pass",
          file: file.name,
          params: { file: file.name },
        });
  });
}

function requiredFindings(
  files: ParsedFile[],
  rule: ValidationRule,
  filenames: string[],
): Finding[] {
  const present = new Set(files.filter((file) => file.role !== "rules").map((file) => file.name));
  return filenames.map((name) =>
    present.has(name)
      ? makeFinding(rule, {
          code: "finding.file_present",
          status: "pass",
          file: name,
          params: { file: name },
        })
      : makeFinding(rule, {
          code: "finding.missing_file",
          status: "fail",
          file: name,
          params: { file: name },
        }),
  );
}

function transmittalFindings(files: ParsedFile[], rule: ValidationRule): Finding[] {
  const transmittals = files.filter((file) => file.role === "transmittal");
  if (transmittals.length === 0) {
    return [
      makeFinding(rule, {
        code: "finding.transmittal_absent",
        status: "fail",
        params: {},
      }),
    ];
  }
  const ownNames = new Set(transmittals.map((file) => file.name));
  const listed = unique(
    transmittals.flatMap((file) => file.text.match(FILENAME_IN_TEXT) ?? []),
  ).filter((name) => !ownNames.has(name));
  const packageNames = files
    .filter((file) => file.role !== "rules" && file.role !== "transmittal")
    .map((file) => file.name);
  const packageSet = new Set(packageNames);
  const listedSet = new Set(listed);
  const findings: Finding[] = [];
  for (const name of listed) {
    if (!packageSet.has(name)) {
      findings.push(
        makeFinding(rule, {
          code: "finding.transmittal_missing_from_package",
          status: "fail",
          file: name,
          params: { file: name },
        }),
      );
    }
  }
  for (const name of packageNames) {
    if (!listedSet.has(name)) {
      findings.push(
        makeFinding(rule, {
          code: "finding.transmittal_missing_from_list",
          status: "fail",
          file: name,
          params: { file: name },
        }),
      );
    }
  }
  if (findings.length === 0) {
    findings.push(
      makeFinding(rule, {
        code: "finding.transmittal_ok",
        status: "pass",
        params: {},
      }),
    );
  }
  return findings;
}

function scopeFiles(files: ParsedFile[], appliesTo: "drawings" | "all"): ParsedFile[] {
  if (appliesTo === "drawings") return files.filter((file) => file.role === "drawing");
  return files.filter((file) => file.role !== "rules");
}

function makeFinding(
  rule: ValidationRule,
  input: {
    code: FindingCode;
    status: "pass" | "fail";
    params: Record<string, string>;
    file?: string;
  },
): Finding {
  const title = rule.titleOverride
    ? { en: rule.titleOverride, pt: rule.titleOverride }
    : rule.title;
  return {
    id: `${rule.id}:${input.code}:${input.file ?? "_"}`,
    ruleId: rule.id,
    bot: "process-qa",
    severity: rule.severity,
    status: input.status,
    code: input.code,
    params: input.params,
    file: input.file,
    sourceDocument: rule.source.document,
    sourceExcerpt: rule.source.excerpt,
    ruleTitle: title,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function decide(findings: Finding[]): Decision {
  const blocking = findings.filter(
    (finding) => finding.status === "fail" && finding.severity === "error",
  );
  const warnings = findings.filter(
    (finding) => finding.status === "fail" && finding.severity === "warning",
  );
  const passes = findings.filter((finding) => finding.status === "pass");
  const ready = blocking.length === 0;
  const rationaleKey = !ready
    ? "decision.notReadyDetail"
    : warnings.length > 0
      ? "decision.readyWarnings"
      : "decision.readyClean";
  return {
    ready,
    errorCount: blocking.length,
    warningCount: warnings.length,
    passCount: passes.length,
    rationaleKey,
    rationaleParams: {
      errors: String(blocking.length),
      warnings: String(warnings.length),
      passes: String(passes.length),
    },
    blockers: blocking.map((finding) => finding.id),
    warnings: warnings.map((finding) => finding.id),
  };
}
