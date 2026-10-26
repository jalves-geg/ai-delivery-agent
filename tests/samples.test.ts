import { describe, expect, it } from "vitest";
import { decide, runChecks } from "@/lib/checks/engine";
import { buildSubmissionDocx } from "@/lib/submission/docx";
import { loadSamplePackage } from "@/lib/samples/load";
import { sampleRules } from "@/lib/samples/rules";
import type { ValidationRule } from "@/lib/types";

describe("sample package", () => {
  it("reads the real demo files and reaches Not ready", async () => {
    process.env.LLM_MODE = "mock";
    const sample = await loadSamplePackage();
    const names = sample.files.map((file) => file.name);
    expect(names).toContain("ub04_mep_draft.pdf");
    expect(names).toContain("UB04-site-photo.png");
    const joined = sample.files.map((file) => file.text).join("\n");
    expect(joined).toContain("All issued drawings shall be delivered as PDF.");
    expect(joined).toContain("Naming pattern for drawings: GEG-NEOM-UB04-<DISC>-<TYPE>-<REV>.pdf");
    expect(joined).toContain("Draft tokens (draft, wip, tmp) are not permitted on issued files.");
    expect(joined).toContain("A spreadsheet transmittal shall list every file in the package using the exact file name.");
    expect(joined).toContain("GEG-NEOM-UB04-STR-FND-P01.pdf");
    const rules: ValidationRule[] = sampleRules().map((rule) => ({ ...rule, status: "approved" }));
    const findings = runChecks(sample.files, rules);
    expect(decide(findings).ready).toBe(false);
    const doc = await buildSubmissionDocx({
      locale: "pt",
      userRequest: sample.userRequest.pt ?? sample.userRequest.en,
      files: sample.files,
      rules,
      findings,
      decision: decide(findings),
      bots: [
        { bot: "requirements", state: "done", model: "demo" },
        { bot: "process-qa", state: "done", model: "demo" },
        { bot: "drawing-qa", state: "stub", model: "demo" },
        { bot: "specifications", state: "skipped", model: "demo" },
        { bot: "lead", state: "done", model: "demo" },
        { bot: "submission", state: "done", model: "demo" },
      ],
    });
    expect(doc.filename).toBe("GEG-UB04-submissao.docx");
    expect(Buffer.from(doc.bytes.subarray(0, 2)).toString()).toBe("PK");
  });
});
