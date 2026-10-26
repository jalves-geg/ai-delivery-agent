import { describe, expect, it } from "vitest";
import { decide, runChecks } from "@/lib/checks/engine";
import { explainFinding } from "@/lib/checks/describe";
import { sampleRules } from "@/lib/samples/rules";
import type { ParsedFile, ValidationRule } from "@/lib/types";

function file(name: string, role: ParsedFile["role"], text = ""): ParsedFile {
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return {
    id: name,
    name,
    role,
    extension,
    mime: "text/plain",
    size: text.length,
    text,
    origin: "upload",
  };
}

const packageFiles: ParsedFile[] = [
  file("PRC-LOD-UB04.docx", "rules", "All issued drawings shall be delivered as PDF."),
  file("BEP-Contract-Excerpt.docx", "rules", "Naming pattern for drawings: GEG-NEOM-UB04-<DISC>-<TYPE>-<REV>.pdf"),
  file("GEG-NEOM-UB04-ARC-PLN-P02.pdf", "drawing", "Architectural floor plan"),
  file("GEG-NEOM-UB04-STR-SEC-P01.pdf", "drawing", "Structural section"),
  file("ub04_mep_draft.pdf", "drawing", "draft"),
  file("GEG-NEOM-UB04-ARC-DET-P02.docx", "drawing", "detail"),
  file(
    "Transmittal-UB04.xlsx",
    "transmittal",
    [
      "GEG-NEOM-UB04-ARC-PLN-P02.pdf",
      "GEG-NEOM-UB04-STR-SEC-P01.pdf",
      "GEG-NEOM-UB04-STR-FND-P01.pdf",
      "GEG-NEOM-UB04-MEP-PLN-P02.pdf",
      "MEP-Narrative.docx",
    ].join("\n"),
  ),
  file("MEP-Narrative.docx", "narrative", "chilled water"),
  file("UB04-site-photo.png", "image"),
];

function approve(rules: ValidationRule[], reject: string[] = []): ValidationRule[] {
  return rules.map((rule) => ({
    ...rule,
    status: reject.includes(rule.id) ? "rejected" : "approved",
  }));
}

describe("process checks", () => {
  it("flags the sample package as not ready when every rule is approved", () => {
    const findings = runChecks(packageFiles, approve(sampleRules()));
    const decision = decide(findings);
    expect(decision.ready).toBe(false);
    expect(findings.some((finding) => finding.code === "finding.filename_mismatch" && finding.file === "ub04_mep_draft.pdf")).toBe(true);
    expect(findings.some((finding) => finding.code === "finding.bad_extension" && finding.file === "GEG-NEOM-UB04-ARC-DET-P02.docx")).toBe(true);
    expect(findings.some((finding) => finding.code === "finding.missing_file" && finding.file === "GEG-NEOM-UB04-STR-FND-P01.pdf")).toBe(true);
    expect(findings.some((finding) => finding.code === "finding.missing_file" && finding.file === "GEG-NEOM-UB04-MEP-PLN-P02.pdf")).toBe(true);
    expect(findings.some((finding) => finding.code === "finding.forbidden_token" && finding.params.token === "draft")).toBe(true);
    expect(findings.some((finding) => finding.code === "finding.transmittal_missing_from_list" && finding.file === "UB04-site-photo.png")).toBe(true);
    expect(findings.some((finding) => finding.code === "finding.filename_ok" && finding.file === "GEG-NEOM-UB04-ARC-PLN-P02.pdf")).toBe(true);
    expect(decision.errorCount).toBeGreaterThan(0);
  });

  it("becomes ready with warnings when blocking rules are rejected", () => {
    const findings = runChecks(
      packageFiles,
      approve(sampleRules(), ["rule-naming", "rule-format", "rule-files"]),
    );
    const decision = decide(findings);
    expect(decision.ready).toBe(true);
    expect(decision.warningCount).toBeGreaterThan(0);
    expect(findings.some((finding) => finding.code === "finding.filename_mismatch")).toBe(false);
    expect(findings.some((finding) => finding.code === "finding.missing_file")).toBe(false);
  });

  it("honours an edited naming pattern", () => {
    const rules = approve(sampleRules()).map((rule) =>
      rule.id === "rule-naming" && rule.check.type === "filename_regex"
        ? { ...rule, edited: true, check: { ...rule.check, pattern: "^.*$" } }
        : rule,
    );
    const findings = runChecks(packageFiles, rules);
    expect(findings.some((finding) => finding.code === "finding.filename_mismatch")).toBe(false);
    expect(findings.some((finding) => finding.code === "finding.filename_ok" && finding.file === "ub04_mep_draft.pdf")).toBe(true);
  });

  it("does not throw on a broken regular expression", () => {
    const rules = approve(sampleRules()).map((rule) =>
      rule.id === "rule-naming" && rule.check.type === "filename_regex"
        ? { ...rule, check: { ...rule.check, pattern: "(" } }
        : rule,
    );
    const findings = runChecks(packageFiles, rules);
    expect(findings.some((finding) => finding.code === "finding.invalid_regex")).toBe(true);
  });

  it("translates a finding without rerunning the check", () => {
    const findings = runChecks(packageFiles, approve(sampleRules()));
    const missing = findings.find((finding) => finding.code === "finding.missing_file");
    expect(missing).toBeTruthy();
    expect(explainFinding("en", missing!)).toContain("not in the package");
    expect(explainFinding("pt", missing!)).toContain("não está no pacote");
  });
});
