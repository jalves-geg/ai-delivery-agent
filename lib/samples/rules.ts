import { l10n, type ValidationRule } from "../types";

const NAMING =
  "^GEG-NEOM-UB04-(ARC|STR|MEP|CIV)-(PLN|SEC|DET|ELE|FND)-(P0[1-9]|C0[1-9])\\.pdf$";

export function sampleRules(): ValidationRule[] {
  return [
    {
      id: "rule-naming",
      category: "naming",
      severity: "error",
      title: l10n(
        "Drawing file name",
        "Nome dos ficheiros de desenho",
      ),
      description: l10n(
        "Issued drawings use GEG-NEOM-UB04-<discipline>-<type>-<revision>.pdf.",
        "Os desenhos emitidos usam GEG-NEOM-UB04-<disciplina>-<tipo>-<revisão>.pdf.",
      ),
      source: {
        document: "BEP-Contract-Excerpt.docx",
        excerpt: l10n(
          "Naming pattern for drawings: GEG-NEOM-UB04-<DISC>-<TYPE>-<REV>.pdf",
          "Naming pattern for drawings: GEG-NEOM-UB04-<DISC>-<TYPE>-<REV>.pdf",
        ),
      },
      check: { type: "filename_regex", pattern: NAMING, appliesTo: "drawings" },
      status: "proposed",
      edited: false,
    },
    {
      id: "rule-format",
      category: "format",
      severity: "error",
      title: l10n("Drawings are issued as PDF", "Desenhos emitidos em PDF"),
      description: l10n(
        "The PDF is the issued record. DOCX or other natives do not replace it.",
        "O PDF é o registo emitido. DOCX ou outros nativos não o substituem.",
      ),
      source: {
        document: "PRC-LOD-UB04.docx",
        excerpt: l10n(
          "All issued drawings shall be delivered as PDF.",
          "All issued drawings shall be delivered as PDF.",
        ),
      },
      check: { type: "allowed_extensions", extensions: ["pdf"], appliesTo: "drawings" },
      status: "proposed",
      edited: false,
    },
    {
      id: "rule-files",
      category: "files",
      severity: "error",
      title: l10n("Stage 3 drawing set", "Conjunto de desenhos da fase 3"),
      description: l10n(
        "The package includes the architectural plan, structural section, foundation plan and MEP plan named in the project requirements.",
        "O pacote inclui a planta de arquitetura, o corte de estruturas, a planta de fundações e a planta de MEP indicadas nos requisitos.",
      ),
      source: {
        document: "Project-Requirements.docx",
        excerpt: l10n(
          "The Stage 3 package shall contain GEG-NEOM-UB04-ARC-PLN-P02.pdf, GEG-NEOM-UB04-STR-SEC-P01.pdf, GEG-NEOM-UB04-STR-FND-P01.pdf and GEG-NEOM-UB04-MEP-PLN-P02.pdf.",
          "The Stage 3 package shall contain GEG-NEOM-UB04-ARC-PLN-P02.pdf, GEG-NEOM-UB04-STR-SEC-P01.pdf, GEG-NEOM-UB04-STR-FND-P01.pdf and GEG-NEOM-UB04-MEP-PLN-P02.pdf.",
        ),
      },
      check: {
        type: "required_filenames",
        filenames: [
          "GEG-NEOM-UB04-ARC-PLN-P02.pdf",
          "GEG-NEOM-UB04-STR-SEC-P01.pdf",
          "GEG-NEOM-UB04-STR-FND-P01.pdf",
          "GEG-NEOM-UB04-MEP-PLN-P02.pdf",
        ],
      },
      status: "proposed",
      edited: false,
    },
    {
      id: "rule-revision",
      category: "revisions",
      severity: "warning",
      title: l10n("No draft tokens", "Sem termos de rascunho"),
      description: l10n(
        "Issued file names must not contain draft, wip or tmp.",
        "Os nomes dos ficheiros emitidos não podem conter draft, wip ou tmp.",
      ),
      source: {
        document: "BEP-Contract-Excerpt.docx",
        excerpt: l10n(
          "Draft tokens (draft, wip, tmp) are not permitted on issued files.",
          "Draft tokens (draft, wip, tmp) are not permitted on issued files.",
        ),
      },
      check: {
        type: "forbid_tokens",
        tokens: ["draft", "wip", "tmp"],
        appliesTo: "drawings",
      },
      status: "proposed",
      edited: false,
    },
    {
      id: "rule-transmittal",
      category: "files",
      severity: "warning",
      title: l10n("Transmittal matches the package", "Guia de remessa igual ao pacote"),
      description: l10n(
        "The spreadsheet lists every package file by its exact name, and every listed file is in the package.",
        "A folha de cálculo lista cada ficheiro do pacote pelo nome exato, e cada ficheiro listado está no pacote.",
      ),
      source: {
        document: "BEP-Contract-Excerpt.docx",
        excerpt: l10n(
          "A spreadsheet transmittal shall list every file in the package using the exact file name.",
          "A spreadsheet transmittal shall list every file in the package using the exact file name.",
        ),
      },
      check: { type: "transmittal_match" },
      status: "proposed",
      edited: false,
    },
  ];
}

export function corpusLooksLikeSample(texts: string[]): boolean {
  const joined = texts.join("\n");
  return (
    joined.includes("GEG-NEOM-UB04-<DISC>-<TYPE>-<REV>.pdf") ||
    joined.includes("Oxagon Utility Building UB-04")
  );
}
