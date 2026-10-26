"use client";

import { useEffect, useRef, useState } from "react";
import { AgentMap } from "@/components/agent-map";
import { DecisionPanel } from "@/components/decision-panel";
import { FindingsPanel } from "@/components/findings-panel";
import { FlowStepper } from "@/components/flow-stepper";
import { InputsPanel } from "@/components/inputs-panel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OutputsPanel } from "@/components/outputs-panel";
import { RulesPanel } from "@/components/rules-panel";
import { t, type MessageKey } from "@/lib/i18n";
import {
  BOT_IDS,
  pick,
  type BotId,
  type BotRunResult,
  type Decision,
  type FileRole,
  type Finding,
  type L10n,
  type Locale,
  type ParsedFile,
  type StepId,
  type ValidationRule,
} from "@/lib/types";

interface PublicConfig {
  mode: "mock" | "live";
  provider: string;
  providerLabel: string;
  baseUrl: string;
  defaultModel: string;
  models: Record<BotId, string>;
  hasApiKey: boolean;
}

interface RunResponse {
  findings: Finding[];
  decision: Decision;
  bots: BotRunResult[];
}

interface ProposeResponse {
  rules: ValidationRule[];
  notice?: "demo_unrecognised";
  meta: { mode: "mock" | "live"; model: string; provider: string };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function freshBots(): Record<BotId, BotRunResult> {
  const bots = {} as Record<BotId, BotRunResult>;
  for (const id of BOT_IDS) {
    const stub = id === "drawing-qa" || id === "specifications";
    bots[id] = { bot: id, state: stub ? "stub" : "idle", mvp: !stub, findings: [] };
  }
  return bots;
}

export function Workbench() {
  const [locale, setLocale] = useState<Locale>("en");
  const [step, setStep] = useState<StepId>("receive");
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [request, setRequest] = useState("");
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [bots, setBots] = useState<Record<BotId, BotRunResult>>(freshBots);
  const [phase, setPhase] = useState<Partial<Record<BotId, string>>>({});
  const [findings, setFindings] = useState<Finding[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [includeOptional, setIncludeOptional] = useState(false);
  const [ran, setRan] = useState(false);
  const [rulesNote, setRulesNote] = useState<string | undefined>();
  const sampleRequest = useRef<L10n | null>(null);
  const requestTouched = useRef(false);
  const playToken = useRef(0);

  function changeLocale(next: Locale) {
    setLocale(next);
    document.documentElement.lang = next;
    if (!requestTouched.current && sampleRequest.current) {
      setRequest(pick(sampleRequest.current, next));
    }
  }

  useEffect(() => {
    fetch("/api/config")
      .then((response) => response.json())
      .then((data: PublicConfig) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  function clearDownstream() {
    setRules([]);
    setFindings([]);
    setDecision(null);
    setRan(false);
    setRulesNote(undefined);
    setBots(freshBots());
    setPhase({});
  }

  async function loadSample() {
    setBusy("sample");
    setError(null);
    try {
      const response = await fetch("/api/samples");
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "samples");
      sampleRequest.current = data.userRequest;
      requestTouched.current = false;
      setFiles(data.files);
      setRequest(pick(data.userRequest, locale));
      clearDownstream();
      setStep("receive");
    } catch {
      setError(t(locale, "errors.generic"));
    } finally {
      setBusy(null);
    }
  }

  async function addFiles(zone: "rules" | "package", list: File[]) {
    if (list.length === 0) return;
    setBusy("parse");
    setError(null);
    try {
      const body = new FormData();
      for (const file of list) body.append(zone, file);
      const response = await fetch("/api/parse", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        setError(errorText(locale, data.error, data));
        return;
      }
      setFiles((current) => [...current, ...data.files]);
      clearDownstream();
    } catch {
      setError(t(locale, "errors.parse"));
    } finally {
      setBusy(null);
    }
  }

  function updateRules(next: ValidationRule[]) {
    setRules(next);
    setFindings([]);
    setDecision(null);
    setRan(false);
    setBots((current) => ({
      ...freshBots(),
      requirements: current.requirements,
    }));
  }

  async function propose() {
    if (!files.some((file) => file.role === "rules")) {
      setError(t(locale, "errors.noRulesDocs"));
      return;
    }
    setBusy("propose");
    setError(null);
    try {
      const data = await postJson<ProposeResponse>("/api/requirements", {
        files,
        userRequest: request,
        locale,
      });
      if (data.notice === "demo_unrecognised") {
        setRules([]);
        setError(t(locale, "errors.demoUnrecognised"));
        return;
      }
      setRules(data.rules);
      setRulesNote(
        data.meta.mode === "mock"
          ? t(locale, "rules.demoNote")
          : t(locale, "rules.liveNote", { model: data.meta.model }),
      );
      setBots((current) => ({
        ...freshBots(),
        requirements: {
          ...current.requirements,
          state: "done",
          mvp: true,
          mode: data.meta.mode,
          model: data.meta.model,
          provider: data.meta.provider,
          summaryKey: "bots.requirements.doneSummary",
          summaryParams: { count: String(data.rules.length) },
          findings: [],
        },
      }));
      setFindings([]);
      setDecision(null);
      setRan(false);
      setStep("approve");
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : t(locale, "errors.requirements"));
    } finally {
      setBusy(null);
    }
  }

  async function distribute() {
    const token = ++playToken.current;
    setBusy("run");
    setError(null);
    setStep("distribute");
    setDecision(null);
    setFindings([]);
    setPhase({ lead: "coordinating" });
    setBots((current) => ({
      ...current,
      lead: { ...current.lead, state: "running", findings: [] },
      "process-qa": { ...freshBots()["process-qa"], state: "idle" },
      submission: { ...freshBots().submission, state: "idle" },
    }));
    try {
      const data = await postJson<RunResponse>("/api/run", {
        files,
        rules,
        userRequest: request,
        locale,
        includeOptional,
      });
      if (playToken.current !== token) return;
      const pace = config?.mode === "live" ? 180 : 650;
      const byId = Object.fromEntries(data.bots.map((bot) => [bot.bot, bot])) as Record<BotId, BotRunResult>;
      const reveal = async (id: BotId, nextPhase?: string) => {
        if (playToken.current !== token) return;
        setPhase(nextPhase ? { [id]: nextPhase } : {});
        setBots((current) => ({ ...current, [id]: { ...current[id], state: "running" } }));
        await sleep(pace);
        if (playToken.current !== token) return;
        setBots((current) => ({ ...current, [id]: byId[id] }));
        setPhase({});
      };
      await reveal("process-qa", "checking");
      await reveal("drawing-qa");
      await reveal("specifications");
      await reveal("lead", "consolidating");
      if (playToken.current !== token) return;
      setDecision({
        ...data.decision,
        rationaleText: byId.lead.summaryText,
        rationaleLocale: byId.lead.summaryLocale,
      });
      setFindings(data.findings);
      await reveal("submission");
      if (playToken.current !== token) return;
      setRan(true);
      setStep("consolidate");
    } catch (cause) {
      if (cause instanceof ApiError && cause.code) {
        setError(errorText(locale, cause.code, { detail: cause.message }));
      } else {
        setError(t(locale, "errors.run"));
      }
    } finally {
      if (playToken.current === token) {
        setBusy(null);
        setPhase({});
      }
    }
  }

  async function download() {
    if (!decision) return;
    setBusy("download");
    setError(null);
    try {
      const response = await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files,
          rules,
          findings,
          decision,
          userRequest: request,
          locale,
          bots: BOT_IDS.map((bot) => ({
            bot,
            state: bots[bot].state,
            model: bots[bot].model,
          })),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new ApiError(data.detail || data.error || "submission", data.error);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = locale === "pt" ? "GEG-UB04-submissao.docx" : "GEG-UB04-submission.docx";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t(locale, "errors.submission"));
    } finally {
      setBusy(null);
    }
  }

  const unlocked: Record<StepId, boolean> = {
    receive: true,
    approve: rules.length > 0,
    distribute: ran || step === "distribute",
    consolidate: Boolean(decision),
    decide: Boolean(decision),
  };

  const center = (() => {
    if (step === "approve" && rules.length > 0) {
      return (
        <RulesPanel
          locale={locale}
          rules={rules}
          busy={busy}
          includeOptional={includeOptional}
          ran={ran}
          note={rulesNote}
          onChange={updateRules}
          onIncludeOptional={setIncludeOptional}
          onDistribute={distribute}
        />
      );
    }
    if (step === "consolidate" && decision) {
      return (
        <div className="flex flex-col gap-4">
          <FindingsPanel
            locale={locale}
            findings={findings}
            title={t(locale, "consolidate.title")}
            intro={t(locale, "consolidate.intro")}
          />
          <button
            type="button"
            onClick={() => setStep("decide")}
            className="self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t(locale, "steps.decide")}
          </button>
        </div>
      );
    }
    if (step === "decide" && decision) {
      return (
        <DecisionPanel
          locale={locale}
          decision={decision}
          findings={findings}
          request={request}
          busy={busy}
          onDownload={download}
        />
      );
    }
    return (
      <div className="flex flex-col gap-4">
        {files.length === 0 ? (
          <div className="rounded-3xl bg-white/80 px-5 py-6 ring-1 ring-border">
            <h2 className="text-xl font-semibold">{t(locale, "inputs.emptyTitle")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t(locale, "inputs.emptyBody")}</p>
          </div>
        ) : null}
        <AgentMap locale={locale} bots={bots} phase={phase} rules={rules} modelFor={(bot) => modelLabel(config, bot, locale)} />
      </div>
    );
  })();

  return (
    <div className="min-h-full bg-[oklch(0.968_0.012_245)]">
      <header className="border-b border-white/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">{t(locale, "app.eyebrow")}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "app.title")}</h1>
            <p className="text-sm text-muted-foreground">{t(locale, "app.subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <ProviderPill locale={locale} config={config} />
            <LanguageSwitcher locale={locale} onChange={changeLocale} />
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4">
        <FlowStepper locale={locale} step={step} unlocked={unlocked} onStep={setStep} />
        {error ? (
          <div className="flex items-start justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200" role="alert">
            <p>{error}</p>
            <button type="button" className="text-xs font-medium underline" onClick={() => setError(null)}>
              {t(locale, "errors.dismiss")}
            </button>
          </div>
        ) : null}
        <div className="grid items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <InputsPanel
            locale={locale}
            files={files}
            request={request}
            busy={busy}
            onRequest={(value) => {
              requestTouched.current = true;
              setRequest(value);
            }}
            onLoadSample={loadSample}
            onAddFiles={addFiles}
            onRemove={(id) => {
              setFiles((current) => current.filter((file) => file.id !== id));
              clearDownstream();
            }}
            onRole={(id, role: FileRole) => {
              setFiles((current) => current.map((file) => (file.id === id ? { ...file, role } : file)));
              clearDownstream();
            }}
            onPropose={propose}
            onReset={() => {
              sampleRequest.current = null;
              requestTouched.current = false;
              setFiles([]);
              setRequest("");
              setStep("receive");
              setError(null);
              clearDownstream();
            }}
          />
          <section className="min-w-0">{center}</section>
          <OutputsPanel locale={locale} decision={decision} findings={findings} busy={busy} onDownload={download} />
        </div>
      </main>
    </div>
  );
}

function ProviderPill({ locale, config }: { locale: Locale; config: PublicConfig | null }) {
  const demo = !config || config.mode === "mock";
  return (
    <details className="relative">
      <summary
        className={`cursor-pointer list-none rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
          demo ? "bg-amber-50 text-amber-950 ring-amber-200" : "bg-emerald-50 text-emerald-900 ring-emerald-200"
        }`}
      >
        {demo ? t(locale, "mode.demo") : `${config?.providerLabel} · ${config?.defaultModel}`}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl bg-white p-3 text-xs shadow-xl ring-1 ring-border">
        <p className="font-semibold">{t(locale, "mode.configured")}</p>
        <p className="mt-1">
          {config?.providerLabel ?? "xAI"} · {config?.defaultModel ?? "grok-4.7"}
        </p>
        <p className="mt-1 break-all text-muted-foreground">
          {t(locale, "mode.baseUrl")}: {config?.baseUrl ?? "https://api.x.ai/v1"}
        </p>
        {demo ? <p className="mt-2 text-amber-900">{t(locale, "mode.noKey")}</p> : null}
        <p className="mt-3 font-semibold">{t(locale, "mode.perBot")}</p>
        <ul className="mt-1 space-y-1 font-mono">
          {BOT_IDS.map((bot) => (
            <li key={bot} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{bot}</span>
              <span>{demo ? t(locale, "mode.demo") : config?.models[bot]}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function modelLabel(config: PublicConfig | null, bot: BotId, locale: Locale): string {
  if (!config || config.mode === "mock") return t(locale, "mode.demo");
  return config.models[bot] || config.defaultModel;
}

class ApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.detail || data.error || "request", data.error);
  }
  return data as T;
}

function errorText(locale: Locale, code: string | undefined, data: { name?: string; detail?: string }): string {
  const key = (
    code === "no_rules_docs"
      ? "errors.noRulesDocs"
      : code === "file_too_large"
        ? "errors.fileTooLarge"
        : code === "too_many_files"
          ? "errors.tooManyFiles"
          : code === "need_decision"
            ? "run.needDecision"
            : code === "need_approval"
              ? "run.needApproval"
              : code === "demo_unrecognised"
                ? "errors.demoUnrecognised"
                : "errors.generic"
  ) as MessageKey;
  const message = t(locale, key, { name: data.name ?? "" });
  return data.detail && code !== "file_too_large" ? `${message} ${data.detail}` : message;
}
