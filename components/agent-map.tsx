"use client";

import {
  BookOpen,
  Bot,
  ClipboardCheck,
  FileOutput,
  FolderCheck,
  Ruler,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { localizedProse, t, type MessageKey } from "@/lib/i18n";
import type { BotId, BotRunResult, BotStateName, Locale, ValidationRule } from "@/lib/types";
import { cn } from "cn";

type Slot =
  | { kind: "bot"; id: BotId; name: MessageKey; blurb: MessageKey; icon: LucideIcon; tone: string; optional?: boolean }
  | { kind: "human" };

const SLOTS: Slot[] = [
  { kind: "bot", id: "requirements", name: "bots.requirements.name", blurb: "bots.requirements.blurb", icon: ClipboardCheck, tone: "bg-blue-100 text-blue-700" },
  { kind: "human" },
  { kind: "bot", id: "drawing-qa", name: "bots.drawingQa.name", blurb: "bots.drawingQa.blurb", icon: Ruler, tone: "bg-sky-100 text-sky-700", optional: true },
  { kind: "bot", id: "process-qa", name: "bots.processQa.name", blurb: "bots.processQa.blurb", icon: FolderCheck, tone: "bg-emerald-100 text-emerald-700" },
  { kind: "bot", id: "lead", name: "bots.lead.name", blurb: "bots.lead.blurb", icon: Bot, tone: "bg-cyan-100 text-cyan-800" },
  { kind: "bot", id: "specifications", name: "bots.specifications.name", blurb: "bots.specifications.blurb", icon: BookOpen, tone: "bg-indigo-100 text-indigo-700", optional: true },
  { kind: "bot", id: "submission", name: "bots.submission.name", blurb: "bots.submission.blurb", icon: FileOutput, tone: "bg-teal-100 text-teal-800" },
];

export function AgentMap({
  locale,
  bots,
  phase,
  rules,
  modelFor,
}: {
  locale: Locale;
  bots: Record<BotId, BotRunResult>;
  phase: Partial<Record<BotId, string>>;
  rules: ValidationRule[];
  modelFor: (bot: BotId) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SLOTS.map((slot) =>
          slot.kind === "human" ? (
            <HumanCard key="human" locale={locale} rules={rules} />
          ) : (
            <BotCard
              key={slot.id}
              locale={locale}
              slot={slot}
              bot={bots[slot.id]}
              phase={phase[slot.id]}
              model={modelFor(slot.id)}
              className={slot.id === "submission" ? "sm:col-start-2" : undefined}
            />
          ),
        )}
      </div>
      <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
        <p className="font-semibold">{t(locale, "map.mvpTitle")}</p>
        <p className="mt-1 text-amber-950/80">{t(locale, "map.mvpBody")}</p>
      </div>
    </div>
  );
}

function BotCard({
  locale,
  slot,
  bot,
  phase,
  model,
  className,
}: {
  locale: Locale;
  slot: Extract<Slot, { kind: "bot" }>;
  bot: BotRunResult;
  phase?: string;
  model: string;
  className?: string;
}) {
  const Icon = slot.icon;
  const summary = localizedProse(locale, bot);
  const state = bot.state;
  return (
    <article
      className={cn(
        "flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-[0_12px_30px_-20px_rgba(20,40,70,0.55)] ring-1 ring-slate-200/80",
        slot.optional && "border border-dashed border-slate-300 bg-slate-50/80",
        slot.id === "lead" && "ring-2 ring-cyan-200",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", slot.tone)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight">{t(locale, slot.name)}</h3>
          <p className="text-xs text-muted-foreground">{t(locale, slot.blurb)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusPill locale={locale} state={state} phase={phase} />
        {slot.optional ? (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t(locale, "bots.optional")}</span>
        ) : (
          <span className="truncate font-mono text-[10px] text-muted-foreground">{model}</span>
        )}
      </div>
      {summary ? <p className="text-xs leading-relaxed text-foreground/80">{summary}</p> : null}
    </article>
  );
}

function HumanCard({ locale, rules }: { locale: Locale; rules: ValidationRule[] }) {
  const state: "waiting" | "review" | "done" =
    rules.length === 0 ? "waiting" : rules.every((rule) => rule.status !== "proposed") ? "done" : "review";
  const label =
    state === "waiting" ? "human.waiting" : state === "review" ? "human.review" : "human.done";
  return (
    <article className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-[0_12px_30px_-20px_rgba(20,40,70,0.55)] ring-1 ring-violet-200">
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <UserRound className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{t(locale, "bots.human.name")}</h3>
          <p className="text-xs text-muted-foreground">{t(locale, "bots.human.blurb")}</p>
        </div>
      </div>
      <StatusPill locale={locale} state={state === "done" ? "done" : state === "review" ? "running" : "idle"} label={t(locale, label)} />
    </article>
  );
}

function StatusPill({
  locale,
  state,
  phase,
  label,
}: {
  locale: Locale;
  state: BotStateName;
  phase?: string;
  label?: string;
}) {
  const phaseKey =
    phase === "coordinating"
      ? "bots.phase.coordinating"
      : phase === "consolidating"
        ? "bots.phase.consolidating"
        : phase === "checking"
          ? "bots.phase.checking"
          : null;
  const text = label ?? (phaseKey ? t(locale, phaseKey) : t(locale, `bots.status.${state}` as MessageKey));
  const tone =
    state === "done"
      ? "bg-emerald-50 text-emerald-800"
      : state === "running"
        ? "bg-cyan-50 text-cyan-900"
        : state === "error"
          ? "bg-rose-50 text-rose-800"
          : state === "stub"
            ? "bg-amber-50 text-amber-900"
            : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>
      <span
        className={cn(
          "size-1.5 rounded-full",
          state === "running" && "animate-pulse bg-cyan-500",
          state === "done" && "bg-emerald-500",
          state === "error" && "bg-rose-500",
          state === "stub" && "bg-amber-500",
          (state === "idle" || state === "skipped") && "bg-slate-400",
        )}
      />
      {text}
    </span>
  );
}
