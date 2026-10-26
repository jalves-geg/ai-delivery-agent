import {
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { z } from "zod";
import { SUBMISSION_PROMPT, withLanguage } from "../agents/prompts";
import { explainFinding } from "../checks/describe";
import { t, type MessageKey } from "../i18n";
import { completeJson } from "../llm";
import { DEMO_PROJECT } from "../project";
import { pick, type BotRunResult, type Decision, type Finding, type Locale, type ParsedFile, type ValidationRule } from "../types";

const NAVY = "142033";
const RULE = "D5E0EE";
const CONTENT_WIDTH = 10080;

const coverSchema = z.object({ coverNote: z.string().min(1).max(1600) });

export interface SubmissionBuildInput {
  locale: Locale;
  userRequest: string;
  files: ParsedFile[];
  rules: ValidationRule[];
  findings: Finding[];
  decision: Decision;
  bots: { bot: BotRunResult["bot"]; state: BotRunResult["state"]; model?: string }[];
}

export async function buildSubmissionDocx(input: SubmissionBuildInput): Promise<{
  bytes: Uint8Array;
  filename: string;
}> {
  const cover = await coverNote(input);
  const labels = (key: MessageKey, params?: Record<string, string | number>) =>
    t(input.locale, key, params);
  const projectName = pick(DEMO_PROJECT.name, input.locale);
  const stage = pick(DEMO_PROJECT.stage, input.locale);
  const decisionLabel = input.decision.ready
    ? labels("decision.ready")
    : labels("decision.notReady");
  const decisionFill = input.decision.ready ? "E5F6EE" : "FDECEC";
  const decisionColor = input.decision.ready ? "0F6B45" : "A32626";

  const children: (Paragraph | Table)[] = [
    heading(labels("submission.heading"), 36),
    metaTable([
      [labels("submission.project"), projectName],
      [labels("submission.code"), DEMO_PROJECT.code],
      [labels("submission.client"), DEMO_PROJECT.client],
      [labels("submission.originator"), DEMO_PROJECT.originator],
      [labels("submission.stage"), stage],
      [labels("submission.date"), new Date().toISOString().slice(0, 10)],
      [labels("submission.language"), input.locale === "pt" ? "Português" : "English"],
    ]),
    spacer(),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            cell(labels("submission.decision"), 2200, { bold: true, fill: decisionFill, color: decisionColor }),
            cell(decisionLabel, 7880, { bold: true, fill: decisionFill, color: decisionColor }),
          ],
        }),
      ],
    }),
    spacer(),
    para(cover.text),
    ...(cover.fallback ? [para(labels("submission.coverFallback"), { italics: true, color: "5C6B80" })] : []),
    heading(labels("submission.request"), 26),
    para(input.userRequest || "—"),
    heading(labels("decision.leadTitle"), 26),
    para(
      input.decision.rationaleText && input.decision.rationaleLocale === input.locale
        ? input.decision.rationaleText
        : labels(input.decision.rationaleKey as MessageKey, input.decision.rationaleParams),
    ),
    heading(labels("submission.rules"), 26),
    rulesTable(input, labels),
    heading(labels("submission.register"), 26),
    registerTable(input, labels),
    heading(labels("submission.findings"), 26),
    findingsTable(input, labels),
    heading(labels("submission.bots"), 26),
    botsTable(input, labels),
  ];

  const doc = new Document({
    creator: "GEG AI Delivery Agent",
    title: labels("submission.heading"),
    description: projectName,
    sections: [
      {
        properties: {
          page: { margin: { top: 800, bottom: 800, left: 900, right: 900 } },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  run("GEG", { bold: true, color: NAVY, size: 20 }),
                  run("   ·   AI Delivery Agent", { color: "5C6B80", size: 20 }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [run(labels("submission.footer"), { italics: true, color: "5C6B80", size: 16 })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return {
    bytes: new Uint8Array(buffer),
    filename: input.locale === "pt" ? "GEG-UB04-submissao.docx" : "GEG-UB04-submission.docx",
  };
}

async function coverNote(input: SubmissionBuildInput): Promise<{ text: string; fallback: boolean }> {
  const template = t(input.locale, "submission.cover", {
    originator: DEMO_PROJECT.originator,
    project: pick(DEMO_PROJECT.name, input.locale),
    code: DEMO_PROJECT.code,
    stage: pick(DEMO_PROJECT.stage, input.locale),
    decision: input.decision.ready
      ? t(input.locale, "decision.ready")
      : t(input.locale, "decision.notReady"),
  });
  try {
    const live = await completeJson(
      {
        bot: "submission",
        temperature: 0.3,
        json: true,
        messages: [
          { role: "system", content: withLanguage(SUBMISSION_PROMPT, input.locale) },
          {
            role: "user",
            content: JSON.stringify({
              project: DEMO_PROJECT,
              userRequest: input.userRequest,
              ready: input.decision.ready,
              errorCount: input.decision.errorCount,
              warningCount: input.decision.warningCount,
            }),
          },
        ],
      },
      { coverNote: template },
      (raw) => coverSchema.parse(raw),
    );
    if (live.meta.mode === "mock") return { text: template, fallback: false };
    return { text: live.data.coverNote.trim() || template, fallback: !live.data.coverNote.trim() };
  } catch {
    return { text: template, fallback: true };
  }
}

function rulesTable(
  input: SubmissionBuildInput,
  labels: (key: MessageKey, params?: Record<string, string | number>) => string,
): Table {
  const header = ["", labels("rules.titleLabel"), labels("submission.status"), labels("submission.file"), labels("submission.excerpt")];
  const widths = [1400, 2200, 1400, 2200, 2880];
  const rows = [
    headerRow(header, widths),
    ...input.rules.map((rule) => {
      const title = rule.titleOverride?.trim() || pick(rule.title, input.locale);
      const status = labels(`rules.${rule.status}` as MessageKey);
      return dataRow(
        [labels(`rules.category.${rule.category}` as MessageKey), title, status, rule.source.document, clip(pick(rule.source.excerpt, input.locale), 180)],
        widths,
      );
    }),
  ];
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, rows });
}

function registerTable(
  input: SubmissionBuildInput,
  labels: (key: MessageKey) => string,
): Table {
  const widths = [4600, 2200, 1600, 1680];
  const rows = [
    headerRow(
      [labels("submission.file"), labels("submission.role"), labels("submission.size"), labels("submission.status")],
      widths,
    ),
    ...input.files.map((file) =>
      dataRow(
        [file.name, labels(`roles.${file.role}` as MessageKey), formatBytes(file.size), file.origin],
        widths,
      ),
    ),
  ];
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, rows });
}

function findingsTable(
  input: SubmissionBuildInput,
  labels: (key: MessageKey, params?: Record<string, string | number>) => string,
): Table {
  const widths = [1400, 1400, 2400, 2200, 2680];
  const rows = [
    headerRow(
      [
        labels("submission.severity"),
        labels("submission.result"),
        labels("submission.file"),
        labels("findings.rule"),
        labels("submission.detail"),
      ],
      widths,
    ),
    ...input.findings.slice(0, 60).map((finding) =>
      dataRow(
        [
          finding.severity,
          finding.status === "pass" ? labels("submission.pass") : labels("submission.fail"),
          finding.file ?? "—",
          pick(finding.ruleTitle, input.locale),
          clip(explainFinding(input.locale, finding), 220),
        ],
        widths,
        finding.status === "fail" && finding.severity === "error" ? "FDECEC" : undefined,
      ),
    ),
  ];
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, rows });
}

function botsTable(
  input: SubmissionBuildInput,
  labels: (key: MessageKey) => string,
): Table {
  const widths = [3600, 2800, 3680];
  const nameKey: Record<BotRunResult["bot"], MessageKey> = {
    requirements: "bots.requirements.name",
    "process-qa": "bots.processQa.name",
    "drawing-qa": "bots.drawingQa.name",
    specifications: "bots.specifications.name",
    lead: "bots.lead.name",
    submission: "bots.submission.name",
  };
  const rows = [
    headerRow([labels("submission.bot"), labels("submission.status"), labels("submission.model")], widths),
    ...input.bots.map((bot) =>
      dataRow(
        [
          labels(nameKey[bot.bot]),
          labels(`bots.status.${bot.state}` as MessageKey),
          bot.model || "—",
        ],
        widths,
      ),
    ),
  ];
  return new Table({ width: { size: CONTENT_WIDTH, type: WidthType.DXA }, rows });
}

function metaTable(pairs: [string, string][]): Table {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: pairs.map(
      ([label, value]) =>
        new TableRow({
          children: [
            cell(label, 2400, { bold: true, fill: "F4F7FB" }),
            cell(value, 7680),
          ],
        }),
    ),
  });
}

function headerRow(values: string[], widths: number[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: values.map((value, index) => cell(value, widths[index] ?? 1800, { bold: true, fill: NAVY, color: "FFFFFF" })),
  });
}

function dataRow(values: string[], widths: number[], fill?: string): TableRow {
  return new TableRow({
    children: values.map((value, index) => cell(value, widths[index] ?? 1800, { fill })),
  });
}

function cell(
  text: string,
  width: number,
  opts?: { bold?: boolean; fill?: string; color?: string },
): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: opts?.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    borders: {
      top: border(),
      bottom: border(),
      left: border(),
      right: border(),
    },
    children: [
      new Paragraph({
        children: [run(text || "—", { bold: opts?.bold, color: opts?.color ?? NAVY, size: 18 })],
      }),
    ],
  });
}

function heading(text: string, size: number): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [run(text, { bold: true, color: NAVY, size })],
  });
}

function para(text: string, opts?: { italics?: boolean; color?: string }): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [run(text, { size: 21, italics: opts?.italics, color: opts?.color ?? "243044" })],
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { after: 80 }, children: [run("")] });
}

function run(
  text: string,
  opts?: { bold?: boolean; italics?: boolean; color?: string; size?: number },
): TextRun {
  return new TextRun({
    text,
    font: "Calibri",
    bold: opts?.bold,
    italics: opts?.italics,
    color: opts?.color,
    size: opts?.size ?? 21,
  });
}

function border() {
  return { style: BorderStyle.SINGLE, size: 4, color: RULE };
}

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
