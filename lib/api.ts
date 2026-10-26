import { z } from "zod";
import { decisionSchema, findingSchema, parsedFileSchema, ruleSchema } from "./schema";
import type { Decision, Finding, ParsedFile, ValidationRule } from "./types";

export function jsonError(error: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const fileList = z.array(z.unknown());

export function parseFiles(value: unknown): ParsedFile[] | null {
  const list = fileList.safeParse(value);
  if (!list.success) return null;
  const normalized = list.data.map((file) => {
    if (!file || typeof file !== "object") return file;
    const record = file as Record<string, unknown>;
    const dataUrl = typeof record.dataUrl === "string" ? record.dataUrl : undefined;
    return {
      ...record,
      text: typeof record.text === "string" ? record.text.slice(0, 30_000) : "",
      dataUrl: dataUrl && dataUrl.length <= 500_000 ? dataUrl : undefined,
    };
  });
  const parsed = z.array(parsedFileSchema).safeParse(normalized);
  return parsed.success ? (parsed.data as ParsedFile[]) : null;
}

export function parseRules(value: unknown): ValidationRule[] | null {
  const parsed = z.array(ruleSchema).safeParse(value);
  return parsed.success ? (parsed.data as ValidationRule[]) : null;
}

export function parseFindings(value: unknown): Finding[] | null {
  const parsed = z.array(findingSchema).safeParse(value);
  return parsed.success ? (parsed.data as Finding[]) : null;
}

export function parseDecision(value: unknown): Decision | null {
  const parsed = decisionSchema.safeParse(value);
  return parsed.success ? (parsed.data as Decision) : null;
}
