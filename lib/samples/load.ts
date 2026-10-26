import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseBuffer } from "../documents/parse";
import { DEMO_PROJECT, SAMPLE_REQUEST } from "../project";
import type { FileRole, ParsedFile } from "../types";

const SAMPLE_FILES: { name: string; role: FileRole }[] = [
  { name: "PRC-LOD-UB04.docx", role: "rules" },
  { name: "BEP-Contract-Excerpt.docx", role: "rules" },
  { name: "Project-Requirements.docx", role: "rules" },
  { name: "GEG-NEOM-UB04-ARC-PLN-P02.pdf", role: "drawing" },
  { name: "GEG-NEOM-UB04-STR-SEC-P01.pdf", role: "drawing" },
  { name: "ub04_mep_draft.pdf", role: "drawing" },
  { name: "GEG-NEOM-UB04-ARC-DET-P02.docx", role: "drawing" },
  { name: "Transmittal-UB04.xlsx", role: "transmittal" },
  { name: "MEP-Narrative.docx", role: "narrative" },
  { name: "UB04-site-photo.png", role: "image" },
];

export async function loadSamplePackage(): Promise<{
  files: ParsedFile[];
  userRequest: typeof SAMPLE_REQUEST;
  project: typeof DEMO_PROJECT;
}> {
  const files: ParsedFile[] = [];
  for (const spec of SAMPLE_FILES) {
    const buffer = await readFile(path.join(process.cwd(), "samples", spec.name));
    files.push(
      await parseBuffer({
        name: spec.name,
        buffer,
        role: spec.role,
        origin: "sample",
        id: `sample-${spec.name}`,
      }),
    );
  }
  return { files, userRequest: SAMPLE_REQUEST, project: DEMO_PROJECT };
}
