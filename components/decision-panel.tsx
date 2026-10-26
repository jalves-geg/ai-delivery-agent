"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FindingsPanel } from "@/components/findings-panel";
import { localizedProse, t } from "@/lib/i18n";
import type { Decision, Finding, Locale } from "@/lib/types";
import { cn } from "cn";

export function DecisionPanel({
  locale,
  decision,
  findings,
  request,
  busy,
  onDownload,
}: {
  locale: Locale;
  decision: Decision;
  findings: Finding[];
  request: string;
  busy: string | null;
  onDownload: () => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div
        className={cn(
          "rounded-3xl px-6 py-8",
          decision.ready ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-950 ring-1 ring-rose-200",
        )}
      >
        <p className="text-sm font-medium">{t(locale, "decision.leadTitle")}</p>
        <h2 className="mt-1 text-4xl font-semibold tracking-tight">
          {decision.ready ? t(locale, "decision.ready") : t(locale, "decision.notReady")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed">{localizedProse(locale, decision)}</p>
        <p className="mt-3 text-xs opacity-80">{t(locale, "decision.rejectedIgnored")}</p>
        <Button type="button" className="mt-4" onClick={onDownload} disabled={busy === "download"}>
          <Download className="size-4" />
          {busy === "download" ? t(locale, "decision.downloading") : t(locale, "decision.download")}
        </Button>
      </div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-border">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(locale, "decision.request")}</p>
        <p className="mt-1 text-sm">{request}</p>
      </div>
      <FindingsPanel locale={locale} findings={findings} />
    </section>
  );
}
