import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import * as XLSX from "xlsx";
import type { FileRole, ParsedFile } from "../types";

const MAX_TEXT = 20_000;
const MAX_IMAGE_DATA_URL = 400_000;

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain",
  dwg: "application/acad",
};

export function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index < 0 ? "" : name.slice(index + 1).toLowerCase();
}

export function inferRole(name: string, zone: "rules" | "package"): FileRole {
  if (zone === "rules") return "rules";
  const extension = extensionOf(name);
  if (["png", "jpg", "jpeg", "gif", "webp", "tif", "tiff"].includes(extension)) return "image";
  if (["xlsx", "xls", "csv"].includes(extension)) return "transmittal";
  if (extension === "pdf" || extension === "dwg") return "drawing";
  if (
    (extension === "docx" || extension === "doc") &&
    /GEG-NEOM-UB04-.+-.+-.+\.docx$/i.test(name)
  ) {
    return "drawing";
  }
  if (extension === "docx" || extension === "doc" || extension === "txt") return "narrative";
  return "other";
}

export async function parseBuffer(input: {
  name: string;
  buffer: Buffer;
  role: FileRole;
  origin: ParsedFile["origin"];
  id?: string;
}): Promise<ParsedFile> {
  const extension = extensionOf(input.name);
  let text = "";
  let parseWarning: string | undefined;
  try {
    text = await extract(input.name, extension, input.buffer);
  } catch (error) {
    parseWarning = error instanceof Error ? error.message : "Parse failed";
  }
  const dataUrl =
    input.role === "image" && input.buffer.length > 0 && input.buffer.length < MAX_IMAGE_DATA_URL
      ? `data:${MIME[extension] ?? "application/octet-stream"};base64,${input.buffer.toString("base64")}`
      : undefined;
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name,
    role: input.role,
    extension,
    mime: MIME[extension] ?? "application/octet-stream",
    size: input.buffer.length,
    text: text.slice(0, MAX_TEXT),
    origin: input.origin,
    dataUrl,
    parseWarning,
  };
}

async function extract(name: string, extension: string, buffer: Buffer): Promise<string> {
  if (extension === "pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const extracted = await extractText(pdf, { mergePages: true });
    return extracted.text;
  }
  if (extension === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }
  if (extension === "xlsx" || extension === "xls") {
    const book = XLSX.read(buffer, { type: "buffer" });
    return book.SheetNames.map((sheetName) => {
      const sheet = book.Sheets[sheetName];
      const csv = sheet ? XLSX.utils.sheet_to_csv(sheet) : "";
      return `# ${sheetName}\n${csv}`;
    }).join("\n");
  }
  if (extension === "csv" || extension === "txt") return buffer.toString("utf8");
  if (["png", "jpg", "jpeg", "gif", "webp", "dwg", "doc"].includes(extension)) return "";
  return "";
}

export const UPLOAD_LIMITS = {
  maxFiles: 20,
  maxBytes: 8 * 1024 * 1024,
};
