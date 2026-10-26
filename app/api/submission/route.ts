import { jsonError, parseDecision, parseFiles, parseFindings, parseRules, readJson } from "@/lib/api";
import { buildSubmissionDocx } from "@/lib/submission/docx";
import { BOT_IDS, isLocale, type BotId, type BotStateName } from "@/lib/types";

const STATES = new Set(["idle", "running", "done", "skipped", "stub", "error"]);

export async function POST(request: Request) {
  const body = (await readJson(request)) as {
    files?: unknown;
    rules?: unknown;
    findings?: unknown;
    decision?: unknown;
    userRequest?: unknown;
    locale?: unknown;
    bots?: unknown;
  } | null;
  if (!body) return jsonError("submission", 400);
  const files = parseFiles(body.files);
  const rules = parseRules(body.rules);
  const findings = parseFindings(body.findings);
  const decision = parseDecision(body.decision);
  if (!files || !rules || !findings || !decision) {
    return jsonError("submission", 400, { detail: "Invalid submission payload." });
  }
  const locale = isLocale(body.locale) ? body.locale : "en";
  const userRequest = typeof body.userRequest === "string" ? body.userRequest.slice(0, 4000) : "";
  const bots = normalizeBots(body.bots);
  try {
    const doc = await buildSubmissionDocx({
      locale,
      userRequest,
      files,
      rules,
      findings,
      decision,
      bots,
    });
    return new Response(Buffer.from(doc.bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
      },
    });
  } catch (error) {
    return jsonError("submission", 500, {
      detail: error instanceof Error ? error.message : "Document failed",
    });
  }
}

function normalizeBots(value: unknown): { bot: BotId; state: BotStateName; model?: string }[] {
  const incoming = Array.isArray(value) ? value : [];
  const byId = new Map<BotId, { bot: BotId; state: BotStateName; model?: string }>();
  for (const item of incoming) {
    if (!item || typeof item !== "object") continue;
    const record = item as { bot?: unknown; state?: unknown; model?: unknown };
    if (typeof record.bot !== "string" || !BOT_IDS.includes(record.bot as BotId)) continue;
    const state = typeof record.state === "string" && STATES.has(record.state) ? (record.state as BotStateName) : "idle";
    byId.set(record.bot as BotId, {
      bot: record.bot as BotId,
      state,
      model: typeof record.model === "string" ? record.model.slice(0, 80) : undefined,
    });
  }
  return BOT_IDS.map((bot) => byId.get(bot) ?? { bot, state: "idle" as const });
}
