import type { BotId } from "../types";
import {
  anthropicMessagesUrl,
  chatCompletionsUrl,
  getLlmConfig,
  type ResolvedLlmConfig,
} from "./config";

export type { ProviderId, PublicLlmConfig, ResolvedLlmConfig } from "./config";
export {
  anthropicMessagesUrl,
  chatCompletionsUrl,
  getLlmConfig,
  PROVIDER_IDS,
  PROVIDER_LABELS,
  publicLlmConfig,
} from "./config";

export class LlmError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LlmError";
  }
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  bot: BotId;
  messages: LlmMessage[];
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
}

export interface LlmResult {
  text: string;
  provider: ResolvedLlmConfig["provider"] | "mock";
  model: string;
  mode: "mock" | "live";
}

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1] ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new LlmError("The model response did not contain a JSON object.");
  }
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch (cause) {
    throw new LlmError("The model response was not valid JSON.", { cause });
  }
}

export async function complete(request: LlmRequest, mockText = ""): Promise<LlmResult> {
  const config = getLlmConfig();
  const model = config.models[request.bot] || config.defaultModel;
  if (config.mode === "mock") {
    return { text: mockText, provider: "mock", model: "demo", mode: "mock" };
  }
  if (!config.apiKey) {
    throw new LlmError(
      "LLM_MODE is live but no API key is set. Set LLM_API_KEY, or use LLM_MODE=mock.",
    );
  }
  const text = await dispatch(config, { ...request, model });
  return { text, provider: config.provider, model, mode: "live" };
}

export async function completeJson<T>(
  request: LlmRequest,
  mockValue: T,
  parse: (raw: unknown) => T,
): Promise<{ data: T; meta: LlmResult }> {
  const config = getLlmConfig();
  if (config.mode === "mock") {
    return {
      data: mockValue,
      meta: { text: "", provider: "mock", model: "demo", mode: "mock" },
    };
  }
  const meta = await complete(request);
  try {
    return { data: parse(extractJson(meta.text)), meta };
  } catch (cause) {
    if (cause instanceof LlmError) throw cause;
    throw new LlmError("The model JSON did not match the expected shape.", { cause });
  }
}

async function dispatch(
  config: ResolvedLlmConfig,
  request: LlmRequest & { model: string },
): Promise<string> {
  if (config.provider === "anthropic") return anthropicComplete(config, request);
  return openaiCompatibleComplete(config, request);
}

async function openaiCompatibleComplete(
  config: ResolvedLlmConfig,
  request: LlmRequest & { model: string },
): Promise<string> {
  const url = chatCompletionsUrl(config, request.model);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.provider === "azure-openai") headers["api-key"] = config.apiKey ?? "";
  else headers.Authorization = `Bearer ${config.apiKey ?? ""}`;

  const body: Record<string, unknown> = {
    messages: request.messages,
    temperature: request.temperature ?? 0.2,
  };
  if (config.provider !== "azure-openai") body.model = request.model;
  if (request.json && config.jsonMode === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await readBody(response);
  if (!response.ok) {
    throw new LlmError(
      `LLM request failed (${response.status}) from ${config.provider}: ${clip(payload)}`,
    );
  }
  const parsed = JSON.parse(payload) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const text = parsed.choices?.[0]?.message?.content;
  if (!text?.trim()) throw new LlmError("The model returned an empty response.");
  return text;
}

async function anthropicComplete(
  config: ResolvedLlmConfig,
  request: LlmRequest & { model: string },
): Promise<string> {
  const system = request.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const messages = request.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role, content: message.content }));
  if (messages.length === 0) messages.push({ role: "user", content: "Respond with the JSON object." });

  const response = await fetch(anthropicMessagesUrl(config), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.2,
      system: system || undefined,
      messages,
    }),
  });
  const payload = await readBody(response);
  if (!response.ok) {
    throw new LlmError(`Anthropic request failed (${response.status}): ${clip(payload)}`);
  }
  const parsed = JSON.parse(payload) as {
    content?: { type?: string; text?: string }[];
  };
  const text = (parsed.content ?? [])
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!text) throw new LlmError("Anthropic returned an empty response.");
  return text;
}

async function readBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function clip(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 400 ? `${clean.slice(0, 400)}…` : clean || "no response body";
}
