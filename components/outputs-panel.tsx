"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FindingList } from "@/components/findings-panel";
import { localizedProse, t } from "@/lib/i18n";
import type { Decision, Finding, Locale } from "@/lib/types";
import { cn } from "cn";

export function OutputsPanel({
  locale,
  decision,
  findings,
  busy,
  onDownload,
}: {
  locale: Locale;
  decision: Decision | null;
  findings: Finding[];
  busy: string | null;
  onDownload: () => void;
}) {
  const problems = findings.filter((finding) => finding.status === "fail").slice(0, 5);
  return (
    <Card className="h-fit bg-white/95">
      <CardHeader>
        <CardTitle>{t(locale, "outputs.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!decision ? (
          <p className="text-sm text-muted-foreground">{t(locale, "outputs.waiting")}</p>
        ) : (
          <>
            <div
              className={cn(
                "rounded-2xl px-4 py-5 text-center",
                decision.ready ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">{t(locale, "decision.leadTitle")}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {decision.ready ? t(locale, "decision.ready") : t(locale, "decision.notReady")}
              </p>
              <p className="mt-2 text-xs">
                {t(locale, "findings.issues")} {decision.errorCount} · {t(locale, "findings.warnings")} {decision.warningCount}
              </p>
            </div>
            <p className="text-sm leading-relaxed">{localizedProse(locale, decision)}</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(locale, "outputs.issues")}</p>
              <FindingList locale={locale} findings={problems} empty={t(locale, "findings.emptyIssues")} compact />
            </div>
            <p className="text-xs text-muted-foreground">{t(locale, "outputs.trace")}</p>
            <Button type="button" onClick={onDownload} disabled={busy === "download"}>
              <Download className="size-4" />
              {busy === "download" ? t(locale, "decision.downloading") : t(locale, "decision.download")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
