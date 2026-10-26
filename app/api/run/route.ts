import { jsonError, parseFiles, parseRules, readJson } from "@/lib/api";
import { LlmError } from "@/lib/llm";
import { runPipeline } from "@/lib/orchestrate";
import { isLocale } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await readJson(request)) as {
    files?: unknown;
    rules?: unknown;
    userRequest?: unknown;
    locale?: unknown;
    includeOptional?: unknown;
  } | null;
  if (!body) return jsonError("run", 400);
  const files = parseFiles(body.files);
  const rules = parseRules(body.rules);
  if (!files || !rules) return jsonError("run", 400, { detail: "Invalid run payload." });
  const approved = rules.filter((rule) => rule.status === "approved");
  const undecided = rules.some((rule) => rule.status === "proposed");
  if (undecided) return jsonError("need_decision", 400);
  if (approved.length === 0) return jsonError("need_approval", 400);
  const locale = isLocale(body.locale) ? body.locale : "en";
  const userRequest = typeof body.userRequest === "string" ? body.userRequest.slice(0, 4000) : "";
  try {
    const result = await runPipeline({
      files,
      rules,
      userRequest,
      locale,
      includeOptional: body.includeOptional === true,
    });
    return Response.json(result);
  } catch (error) {
    const detail = error instanceof LlmError || error instanceof Error ? error.message : "Run failed";
    return jsonError("run", 502, { detail });
  }
}
