import { afterEach, describe, expect, it, vi } from "vitest";
import {
  anthropicMessagesUrl,
  chatCompletionsUrl,
  complete,
  getLlmConfig,
} from "@/lib/llm";

const KEYS = [
  "LLM_API_KEY",
  "LLM_MODE",
  "LLM_PROVIDER",
  "LLM_BASE_URL",
  "LLM_MODEL",
  "LLM_JSON_MODE",
  "ANTHROPIC_API_KEY",
  "AZURE_OPENAI_DEPLOYMENT",
  "AZURE_OPENAI_API_VERSION",
  "LLM_MODEL_LEAD",
  "LLM_MODEL_REQUIREMENTS",
  "LLM_MODEL_PROCESS_QA",
  "LLM_MODEL_DRAWING_QA",
  "LLM_MODEL_SPECIFICATIONS",
  "LLM_MODEL_SUBMISSION",
];

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
  vi.unstubAllGlobals();
});

describe("LLM config", () => {
  it("defaults to xAI Grok and demo mode without a key", () => {
    const config = getLlmConfig();
    expect(config.provider).toBe("xai");
    expect(config.baseUrl).toBe("https://api.x.ai/v1");
    expect(config.defaultModel).toBe("grok-4.7");
    expect(config.mode).toBe("mock");
    expect(config.models.lead).toBe("grok-4.7");
    expect(config.models["process-qa"]).toBe("grok-4.7");
  });

  it("lets each bot pick its own model", () => {
    process.env.LLM_MODEL = "grok-4.6";
    process.env.LLM_MODEL_LEAD = "grok-4.5";
    process.env.LLM_MODEL_SUBMISSION = "grok-4.7";
    const config = getLlmConfig();
    expect(config.models.lead).toBe("grok-4.5");
    expect(config.models.submission).toBe("grok-4.7");
    expect(config.models.requirements).toBe("grok-4.6");
  });

  it("switches providers from environment variables", () => {
    process.env.LLM_PROVIDER = "local";
    expect(getLlmConfig().baseUrl).toBe("http://127.0.0.1:11434/v1");
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_BASE_URL = "https://example.test/v1";
    expect(getLlmConfig().baseUrl).toBe("https://example.test/v1");
    expect(getLlmConfig().provider).toBe("openai");
  });

  it("builds Azure and Anthropic endpoints", () => {
    const azure = getLlmConfig({
      ...process.env,
      LLM_PROVIDER: "azure-openai",
      LLM_BASE_URL: "https://geg.openai.azure.com",
      AZURE_OPENAI_DEPLOYMENT: "geg-gpt",
      AZURE_OPENAI_API_VERSION: "2024-10-21",
      LLM_MODEL: "ignored",
    });
    expect(chatCompletionsUrl(azure, "ignored")).toBe(
      "https://geg.openai.azure.com/openai/deployments/geg-gpt/chat/completions?api-version=2024-10-21",
    );
    const anthropic = getLlmConfig({
      ...process.env,
      LLM_PROVIDER: "anthropic",
      LLM_BASE_URL: "https://api.anthropic.com",
    });
    expect(anthropicMessagesUrl(anthropic)).toBe("https://api.anthropic.com/v1/messages");
  });

  it("does not call the network in demo mode", async () => {
    process.env.LLM_MODE = "mock";
    process.env.LLM_API_KEY = "should-not-be-sent";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await complete(
      { bot: "lead", messages: [{ role: "user", content: "hi" }] },
      "demo-text",
    );
    expect(result).toMatchObject({ mode: "mock", provider: "mock", text: "demo-text" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the xAI chat completions endpoint when live", async () => {
    process.env.LLM_MODE = "live";
    process.env.LLM_PROVIDER = "xai";
    process.env.LLM_API_KEY = "xai-test";
    process.env.LLM_MODEL_LEAD = "grok-4.5";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await complete({
      bot: "lead",
      json: true,
      messages: [
        { role: "system", content: "json" },
        { role: "user", content: "hi" },
      ],
    });
    expect(result.model).toBe("grok-4.5");
    expect(result.provider).toBe("xai");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer xai-test");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("grok-4.5");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("calls Anthropic with its own request shape", async () => {
    process.env.LLM_MODE = "live";
    process.env.LLM_PROVIDER = "anthropic";
    process.env.ANTHROPIC_API_KEY = "sk-ant";
    process.env.LLM_MODEL = "claude-sonnet-4-5";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ content: [{ type: "text", text: "{\"ok\":true}" }] }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await complete({
      bot: "requirements",
      json: true,
      messages: [
        { role: "system", content: "system" },
        { role: "user", content: "user" },
      ],
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-sonnet-4-5");
    expect(body.system).toBe("system");
    expect(body.response_format).toBeUndefined();
  });
});
