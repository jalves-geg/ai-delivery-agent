"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { describeCheck } from "@/lib/checks/describe";
import { t, type MessageKey } from "@/lib/i18n";
import { pick, type Check, type Locale, type ValidationRule } from "@/lib/types";
import { cn } from "cn";

export function RulesPanel({
  locale,
  rules,
  busy,
  includeOptional,
  ran,
  note,
  onChange,
  onIncludeOptional,
  onDistribute,
}: {
  locale: Locale;
  rules: ValidationRule[];
  busy: string | null;
  includeOptional: boolean;
  ran: boolean;
  note?: string;
  onChange: (rules: ValidationRule[]) => void;
  onIncludeOptional: (value: boolean) => void;
  onDistribute: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const decided = rules.filter((rule) => rule.status !== "proposed").length;
  const approved = rules.some((rule) => rule.status === "approved");
  const allDecided = rules.length > 0 && decided === rules.length;
  const blockedReason = !allDecided
    ? t(locale, "run.needDecision")
    : !approved
      ? t(locale, "run.needApproval")
      : null;

  function patch(id: string, next: Partial<ValidationRule>) {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...next } : rule)));
  }

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">{t(locale, "rules.title")}</h2>
        <p className="text-sm text-muted-foreground">{t(locale, "rules.subtitle")}</p>
        {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(rules.map((rule) => ({ ...rule, status: "approved" })))}>
          {t(locale, "rules.approveAll")}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange(rules.map((rule) => ({ ...rule, status: "rejected" })))}>
          {t(locale, "rules.rejectAll")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t(locale, "rules.progress", { decided, total: rules.length })}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {rules.map((rule) => (
          <RuleCard
            key={rule.id}
            locale={locale}
            rule={rule}
            editing={editing === rule.id}
            onEdit={() => setEditing(rule.id)}
            onCancel={() => setEditing(null)}
            onApprove={() => patch(rule.id, { status: "approved" })}
            onReject={() => patch(rule.id, { status: "rejected" })}
            onSave={(next) => {
              patch(rule.id, next);
              setEditing(null);
            }}
          />
        ))}
      </div>
      <div className="sticky bottom-3 flex flex-col gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-border">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeOptional}
            onChange={(event) => onIncludeOptional(event.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          {t(locale, "run.includeOptional")}
        </label>
        <p className="text-xs text-muted-foreground">{t(locale, "rules.excluded")}</p>
        {blockedReason ? <p className="text-xs text-amber-800">{blockedReason}</p> : null}
        <Button type="button" size="lg" disabled={Boolean(busy) || !allDecided || !approved} onClick={onDistribute}>
          {busy === "run" ? t(locale, "run.running") : ran ? t(locale, "run.redistribute") : t(locale, "run.distribute")}
        </Button>
      </div>
    </section>
  );
}

function RuleCard({
  locale,
  rule,
  editing,
  onEdit,
  onCancel,
  onApprove,
  onReject,
  onSave,
}: {
  locale: Locale;
  rule: ValidationRule;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onApprove: () => void;
  onReject: () => void;
  onSave: (next: Partial<ValidationRule>) => void;
}) {
  const title = rule.titleOverride?.trim() || pick(rule.title, locale);
  const description = rule.descriptionOverride?.trim() || pick(rule.description, locale);
  return (
    <article
      className={cn(
        "rounded-2xl bg-white p-4 shadow-sm ring-1",
        rule.status === "approved" && "ring-emerald-200",
        rule.status === "rejected" && "bg-slate-50 ring-slate-200 opacity-80",
        rule.status === "proposed" && "ring-blue-200",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
          {t(locale, `rules.category.${rule.category}` as MessageKey)}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            rule.severity === "error" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900",
          )}
        >
          {t(locale, rule.severity === "error" ? "rules.severity.error" : "rules.severity.warning")}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium ring-1 ring-border">
          {t(locale, `rules.${rule.status}` as MessageKey)}
        </span>
        {rule.edited ? (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800">
            {t(locale, "rules.edited")}
          </span>
        ) : null}
      </div>
      <h3 className={cn("mt-2 text-sm font-semibold", rule.status === "rejected" && "line-through")}>{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className="mt-2 text-xs text-foreground/80">{describeCheck(rule.check, locale)}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{t(locale, "rules.source")}: </span>
        <span className="font-mono">{rule.source.document}</span>
      </p>
      <blockquote className="mt-1 border-l-2 border-primary/30 pl-2 text-xs text-muted-foreground">
        {pick(rule.source.excerpt, locale)}
      </blockquote>
      {editing ? (
        <RuleEditor locale={locale} rule={rule} title={title} description={description} onCancel={onCancel} onSave={onSave} />
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={rule.status === "approved" ? "default" : "outline"} onClick={onApprove}>
            {t(locale, "rules.approve")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onEdit}>
            {t(locale, "rules.edit")}
          </Button>
          <Button type="button" size="sm" variant={rule.status === "rejected" ? "destructive" : "outline"} onClick={onReject}>
            {t(locale, "rules.reject")}
          </Button>
        </div>
      )}
    </article>
  );
}

function RuleEditor({
  locale,
  rule,
  title,
  description,
  onCancel,
  onSave,
}: {
  locale: Locale;
  rule: ValidationRule;
  title: string;
  description: string;
  onCancel: () => void;
  onSave: (next: Partial<ValidationRule>) => void;
}) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDescription, setDraftDescription] = useState(description);
  const [pattern, setPattern] = useState(patternOf(rule.check));
  const [appliesTo, setAppliesTo] = useState(appliesOf(rule.check));
  const [filenames, setFilenames] = useState(rule.check.type === "required_filenames" ? rule.check.filenames.join("\n") : "");
  const [extensions, setExtensions] = useState(rule.check.type === "allowed_extensions" ? rule.check.extensions.join(", ") : "");
  const [tokens, setTokens] = useState(rule.check.type === "forbid_tokens" ? rule.check.tokens.join(", ") : "");
  const [error, setError] = useState<string | null>(null);

  function save() {
    const check = buildCheck(rule.check, { pattern, appliesTo, filenames, extensions, tokens });
    if (!check) {
      setError(t(locale, "rules.invalidRegex"));
      return;
    }
    onSave({
      titleOverride: draftTitle.trim(),
      descriptionOverride: draftDescription.trim(),
      check,
      edited: true,
      status: "approved",
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-muted/60 p-3">
      <label className="text-xs font-medium">
        {t(locale, "rules.titleLabel")}
        <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} className="mt-1 bg-white" />
      </label>
      <label className="text-xs font-medium">
        {t(locale, "rules.descriptionLabel")}
        <Textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} className="mt-1 bg-white" />
      </label>
      {rule.check.type === "filename_regex" || rule.check.type === "revision_regex" ? (
        <label className="text-xs font-medium">
          {t(locale, "rules.pattern")}
          <Input value={pattern} onChange={(event) => setPattern(event.target.value)} className="mt-1 bg-white font-mono text-xs" />
        </label>
      ) : null}
      {rule.check.type === "required_filenames" ? (
        <label className="text-xs font-medium">
          {t(locale, "rules.filenames")}
          <Textarea value={filenames} onChange={(event) => setFilenames(event.target.value)} className="mt-1 bg-white font-mono text-xs" />
          <span className="mt-1 block font-normal text-muted-foreground">{t(locale, "rules.filenamesHint")}</span>
        </label>
      ) : null}
      {rule.check.type === "allowed_extensions" ? (
        <label className="text-xs font-medium">
          {t(locale, "rules.extensions")}
          <Input value={extensions} onChange={(event) => setExtensions(event.target.value)} className="mt-1 bg-white" />
          <span className="mt-1 block font-normal text-muted-foreground">{t(locale, "rules.extensionsHint")}</span>
        </label>
      ) : null}
      {rule.check.type === "forbid_tokens" ? (
        <label className="text-xs font-medium">
          {t(locale, "rules.tokens")}
          <Input value={tokens} onChange={(event) => setTokens(event.target.value)} className="mt-1 bg-white" />
          <span className="mt-1 block font-normal text-muted-foreground">{t(locale, "rules.tokensHint")}</span>
        </label>
      ) : null}
      {rule.check.type === "transmittal_match" ? (
        <p className="text-xs text-muted-foreground">{t(locale, "rules.noParams")}</p>
      ) : null}
      {"appliesTo" in rule.check ? (
        <label className="text-xs font-medium">
          {t(locale, "rules.appliesTo")}
          <select
            value={appliesTo}
            onChange={(event) => setAppliesTo(event.target.value as "drawings" | "all")}
            className="mt-1 h-8 w-full rounded-lg border border-input bg-white px-2 text-sm"
          >
            <option value="drawings">{t(locale, "rules.appliesDrawings")}</option>
            <option value="all">{t(locale, "rules.appliesAll")}</option>
          </select>
        </label>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={save}>
          {t(locale, "rules.save")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          {t(locale, "rules.cancel")}
        </Button>
      </div>
    </div>
  );
}

function patternOf(check: Check): string {
  return check.type === "filename_regex" || check.type === "revision_regex" ? check.pattern : "";
}

function appliesOf(check: Check): "drawings" | "all" {
  return "appliesTo" in check ? check.appliesTo : "drawings";
}

function buildCheck(
  check: Check,
  draft: {
    pattern: string;
    appliesTo: "drawings" | "all";
    filenames: string;
    extensions: string;
    tokens: string;
  },
): Check | null {
  if (check.type === "filename_regex" || check.type === "revision_regex") {
    try {
      new RegExp(draft.pattern);
    } catch {
      return null;
    }
    return { ...check, pattern: draft.pattern, appliesTo: draft.appliesTo };
  }
  if (check.type === "allowed_extensions") {
    return {
      ...check,
      appliesTo: draft.appliesTo,
      extensions: splitList(draft.extensions).map((item) => item.replace(/^\./, "")),
    };
  }
  if (check.type === "forbid_tokens") {
    return { ...check, appliesTo: draft.appliesTo, tokens: splitList(draft.tokens) };
  }
  if (check.type === "required_filenames") {
    const filenames = draft.filenames
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    return filenames.length ? { type: "required_filenames", filenames } : null;
  }
  return check;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
