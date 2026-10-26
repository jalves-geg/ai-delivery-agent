import { BOT_IDS, type BotId } from "../types";

export const PROVIDER_IDS = [
  "xai",
  "openai",
  "anthropic",
  "azure-openai",
  "openai-compatible",
  "local",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ResolvedLlmConfig {
  mode: "mock" | "live";
  provider: ProviderId;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
  models: Record<BotId, string>;
  azureApiVersion: string;
  azureDeployment?: string;
  jsonMode: "json_object" | "prompt";
}

const PROVIDER_DEFAULTS: Record<ProviderId, { baseUrl: string; model: string }> = {
  xai: { baseUrl: "https://api.x.ai/v1", model: "grok-4.7" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-4-5" },
  "azure-openai": { baseUrl: "", model: "" },
  "openai-compatible": { baseUrl: "http://127.0.0.1:11434/v1", model: "llama3.1" },
  local: { baseUrl: "http://127.0.0.1:11434/v1", model: "llama3.1" },
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  xai: "xAI",
  openai: "OpenAI",
  anthropic: "Anthropic",
  "azure-openai": "Azure OpenAI",
  "openai-compatible": "OpenAI-compatible",
  local: "Local",
};

const BOT_MODEL_ENV: Record<BotId, string> = {
  lead: "LLM_MODEL_LEAD",
  requirements: "LLM_MODEL_REQUIREMENTS",
  "process-qa": "LLM_MODEL_PROCESS_QA",
  "drawing-qa": "LLM_MODEL_DRAWING_QA",
  specifications: "LLM_MODEL_SPECIFICATIONS",
  submission: "LLM_MODEL_SUBMISSION",
};

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export function getLlmConfig(env: NodeJS.ProcessEnv = process.env): ResolvedLlmConfig {
  const requested = (env.LLM_PROVIDER ?? "xai").trim().toLowerCase();
  if (!isProviderId(requested)) {
    throw new Error(
      `Unknown LLM_PROVIDER "${requested}". Use ${PROVIDER_IDS.join(", ")}.`,
    );
  }
  const defaults = PROVIDER_DEFAULTS[requested];
  const baseUrl = (env.LLM_BASE_URL?.trim() || defaults.baseUrl).replace(/\/$/, "");
  const defaultModel = env.LLM_MODEL?.trim() || defaults.model;
  const apiKey =
    requested === "anthropic"
      ? env.ANTHROPIC_API_KEY?.trim() || env.LLM_API_KEY?.trim()
      : env.LLM_API_KEY?.trim();
  const modeEnv = (env.LLM_MODE ?? "auto").trim().toLowerCase();
  let mode: "mock" | "live";
  if (modeEnv === "mock") mode = "mock";
  else if (modeEnv === "live") mode = "live";
  else if (modeEnv === "auto") mode = apiKey ? "live" : "mock";
  else {
    throw new Error('LLM_MODE must be "auto", "mock" or "live".');
  }

  const models = {} as Record<BotId, string>;
  for (const bot of BOT_IDS) {
    models[bot] = env[BOT_MODEL_ENV[bot]]?.trim() || defaultModel;
  }

  const jsonPref = (env.LLM_JSON_MODE ?? "auto").trim().toLowerCase();
  const jsonMode: "json_object" | "prompt" =
    jsonPref === "prompt" || requested === "anthropic" ? "prompt" : "json_object";

  return {
    mode,
    provider: requested,
    apiKey: apiKey || undefined,
    baseUrl,
    defaultModel,
    models,
    azureApiVersion: env.AZURE_OPENAI_API_VERSION?.trim() || "2024-10-21",
    azureDeployment: env.AZURE_OPENAI_DEPLOYMENT?.trim() || undefined,
    jsonMode,
  };
}

export interface PublicLlmConfig {
  mode: "mock" | "live";
  provider: ProviderId;
  providerLabel: string;
  baseUrl: string;
  defaultModel: string;
  models: Record<BotId, string>;
  hasApiKey: boolean;
}

export function publicLlmConfig(config: ResolvedLlmConfig = getLlmConfig()): PublicLlmConfig {
  return {
    mode: config.mode,
    provider: config.provider,
    providerLabel: PROVIDER_LABELS[config.provider],
    baseUrl: config.baseUrl,
    defaultModel: config.defaultModel,
    models: config.models,
    hasApiKey: Boolean(config.apiKey),
  };
}

export function chatCompletionsUrl(config: ResolvedLlmConfig, model: string): string {
  const base = config.baseUrl.replace(/\/$/, "");
  if (base.endsWith("/chat/completions")) return base;
  if (config.provider === "azure-openai") {
    const deployment = config.azureDeployment || model;
    if (!base || !deployment) {
      throw new Error(
        "Azure OpenAI needs LLM_BASE_URL (https://YOUR_RESOURCE.openai.azure.com) and AZURE_OPENAI_DEPLOYMENT or LLM_MODEL.",
      );
    }
    return `${base}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(config.azureApiVersion)}`;
  }
  if (!base) throw new Error("LLM_BASE_URL is empty.");
  return `${base}/chat/completions`;
}

export function anthropicMessagesUrl(config: ResolvedLlmConfig): string {
  const base = config.baseUrl.replace(/\/$/, "");
  if (!base) throw new Error("LLM_BASE_URL is empty.");
  if (base.endsWith("/v1/messages")) return base;
  if (base.endsWith("/v1")) return `${base}/messages`;
  return `${base}/v1/messages`;
}
