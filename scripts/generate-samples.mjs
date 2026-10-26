import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as XLSX from "xlsx";

const root = path.join(process.cwd(), "samples");
await mkdir(root, { recursive: true });

async function writeDocx(name, lines) {
  const doc = new Document({
    sections: [
      {
        children: lines.map(
          (line, index) =>
            new Paragraph({
              heading: index === 0 ? HeadingLevel.HEADING_1 : undefined,
              spacing: { after: 160 },
              children: [
                new TextRun({
                  text: line,
                  font: "Calibri",
                  size: index === 0 ? 32 : 22,
                }),
              ],
            }),
        ),
      },
    ],
  });
  await writeFile(path.join(root, name), await Packer.toBuffer(doc));
}

async function writeDrawing(name, lines) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({
    x: 16,
    y: 16,
    width: 810,
    height: 563,
    borderColor: rgb(0.08, 0.15, 0.28),
    borderWidth: 1.4,
  });
  page.drawRectangle({ x: 16, y: 16, width: 810, height: 64, color: rgb(0.93, 0.95, 0.98) });
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 36,
      y: 540 - index * 24,
      size: index === 0 ? 16 : 12,
      font: index === 0 ? bold : font,
      color: rgb(0.08, 0.13, 0.22),
    });
  });
  page.drawText("GEG  |  NEOM Oxagon UB-04  |  Stage 3 design issue", {
    x: 36,
    y: 40,
    size: 10,
    font,
    color: rgb(0.12, 0.22, 0.38),
  });
  await writeFile(path.join(root, name), Buffer.from(await pdf.save()));
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([length, body, crc]);
}

function sitePhoto() {
  const width = 360;
  const height = 220;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const sky = y < 140;
      let r = sky ? 186 + Math.floor((140 - y) / 8) : 214;
      let g = sky ? 208 : 196;
      let b = sky ? 224 : 176;
      const building = x > 70 && x < 250 && y > 70 && y < 175;
      if (building) {
        r = 36;
        g = 58;
        b = 84;
      }
      const windowCol = building && (x - 80) % 28 < 12 && (y - 82) % 22 < 10 && y < 160;
      if (windowCol) {
        r = 232;
        g = 240;
        b = 246;
      }
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

await writeDocx("PRC-LOD-UB04.docx", [
  "GEG — Project Requirements & Level of Development",
  "Project: Oxagon Utility Building UB-04",
  "Client: NEOM",
  "Stage: Stage 3 design submission",
  "Originator: GEG",
  "1. Drawing format",
  "All issued drawings shall be delivered as PDF. Native copies may accompany the issue but do not replace the PDF record.",
  "2. Level of development",
  "Architectural and structural drawings are required at LOD 300 for this submission. MEP layouts are required at LOD 200.",
  "3. Printing",
  "Drawings shall be composed for A1 printing, monochrome, with a readable title block.",
  "4. Required drawing types",
  "Architectural floor plan, structural section, structural foundation plan and MEP plan.",
]);

await writeDocx("BEP-Contract-Excerpt.docx", [
  "BIM Execution Plan — excerpt (contract)",
  "Project: Oxagon Utility Building UB-04",
  "File naming",
  "Naming pattern for drawings: GEG-NEOM-UB04-<DISC>-<TYPE>-<REV>.pdf",
  "DISC is ARC, STR, MEP or CIV. TYPE is PLN, SEC, DET, ELE or FND. REV is P01, P02, P03 or C01.",
  "Revision policy",
  "The revision token is the last segment of the file name. Draft tokens (draft, wip, tmp) are not permitted on issued files. Superseded revisions must not be included.",
  "Transmittal",
  "A spreadsheet transmittal shall list every file in the package using the exact file name. The package and the transmittal must match.",
]);

await writeDocx("Project-Requirements.docx", [
  "UB-04 Project Requirements — deliverable checklist",
  "Project: Oxagon Utility Building UB-04",
  "Stage 3 design submission",
  "The Stage 3 package shall contain GEG-NEOM-UB04-ARC-PLN-P02.pdf, GEG-NEOM-UB04-STR-SEC-P01.pdf, GEG-NEOM-UB04-STR-FND-P01.pdf and GEG-NEOM-UB04-MEP-PLN-P02.pdf.",
  "Also include Transmittal-UB04.xlsx and MEP-Narrative.docx.",
  "The foundation plan is a mandatory structural deliverable for this issue.",
]);

await writeDocx("MEP-Narrative.docx", [
  "MEP narrative — UB-04 utility building",
  "Revision P01. Status S2.",
  "This narrative describes the LOD 200 MEP layout for the utility building.",
  "Systems: chilled water, ventilation and small-power distribution.",
  "The issued drawing for this narrative is GEG-NEOM-UB04-MEP-PLN-P02.pdf.",
]);

await writeDocx("GEG-NEOM-UB04-ARC-DET-P02.docx", [
  "GEG-NEOM-UB04-ARC-DET-P02",
  "Architectural detail — door threshold, utility building UB-04.",
  "Revision P02. This file was exported as DOCX.",
  "The PRC requires issued drawings as PDF.",
]);

await writeDrawing("GEG-NEOM-UB04-ARC-PLN-P02.pdf", [
  "GEG-NEOM-UB04-ARC-PLN-P02",
  "Architectural floor plan",
  "Oxagon Utility Building UB-04",
  "Revision P02   Discipline ARC   Scale 1:100",
  "Sheet size A1. Monochrome title block.",
]);

await writeDrawing("GEG-NEOM-UB04-STR-SEC-P01.pdf", [
  "GEG-NEOM-UB04-STR-SEC-P01",
  "Structural section A-A",
  "Oxagon Utility Building UB-04",
  "Revision P01   Discipline STR   Scale 1:50",
  "Level of development LOD 300.",
]);

await writeDrawing("ub04_mep_draft.pdf", [
  "ub04_mep_draft",
  "MEP plan working draft",
  "Oxagon Utility Building UB-04",
  "Not issued. File name does not carry a revision token.",
  "Replace with GEG-NEOM-UB04-MEP-PLN-P02.pdf before submission.",
]);

const rows = [
  ["File name", "Revision", "Status", "Discipline", "Notes"],
  ["GEG-NEOM-UB04-ARC-PLN-P02.pdf", "P02", "S2", "ARC", "Floor plan"],
  ["GEG-NEOM-UB04-STR-SEC-P01.pdf", "P01", "S2", "STR", "Section"],
  ["GEG-NEOM-UB04-STR-FND-P01.pdf", "P01", "S2", "STR", "Foundation plan, not in this package"],
  ["GEG-NEOM-UB04-MEP-PLN-P02.pdf", "P02", "S2", "MEP", "Issued MEP plan expected"],
  ["Transmittal-UB04.xlsx", "-", "-", "-", "This transmittal"],
  ["MEP-Narrative.docx", "P01", "S2", "MEP", "Narrative"],
];
const book = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet(rows);
sheet["!cols"] = [{ wch: 42 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 40 }];
XLSX.utils.book_append_sheet(book, sheet, "Transmittal");
XLSX.writeFile(book, path.join(root, "Transmittal-UB04.xlsx"));

await writeFile(path.join(root, "UB04-site-photo.png"), sitePhoto());

console.log("Sample package written to samples/");
