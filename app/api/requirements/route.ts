import { proposeRules } from "@/lib/agents/requirements";
import { jsonError, parseFiles, readJson } from "@/lib/api";
import { LlmError } from "@/lib/llm";
import { isLocale } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await readJson(request)) as {
    files?: unknown;
    userRequest?: unknown;
    locale?: unknown;
  } | null;
  if (!body) return jsonError("requirements", 400);
  const files = parseFiles(body.files);
  if (!files) return jsonError("requirements", 400, { detail: "Invalid file payload." });
  if (!files.some((file) => file.role === "rules")) return jsonError("no_rules_docs", 400);
  const locale = isLocale(body.locale) ? body.locale : "en";
  const userRequest = typeof body.userRequest === "string" ? body.userRequest.slice(0, 4000) : "";
  try {
    const result = await proposeRules({ files, userRequest, locale });
    return Response.json(result);
  } catch (error) {
    const detail = error instanceof LlmError || error instanceof Error ? error.message : "Requirements failed";
    return jsonError("requirements", 502, { detail });
  }
}
