"use client";

import { explainFinding } from "@/lib/checks/describe";
import { t } from "@/lib/i18n";
import { pick, type Finding, type Locale } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";

export function FindingsPanel({
  locale,
  findings,
  title,
  intro,
}: {
  locale: Locale;
  findings: Finding[];
  title?: string;
  intro?: string;
}) {
  const issues = findings.filter((finding) => finding.status === "fail" && finding.severity === "error");
  const warnings = findings.filter((finding) => finding.status === "fail" && finding.severity === "warning");
  const passed = findings.filter((finding) => finding.status === "pass");
  return (
    <section className="flex flex-col gap-3">
      {title ? <h2 className="text-lg font-semibold">{title}</h2> : null}
      {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
      <Tabs defaultValue="issues">
        <TabsList>
          <TabsTrigger value="issues">
            {t(locale, "findings.issues")} ({issues.length})
          </TabsTrigger>
          <TabsTrigger value="warnings">
            {t(locale, "findings.warnings")} ({warnings.length})
          </TabsTrigger>
          <TabsTrigger value="passed">
            {t(locale, "findings.passed")} ({passed.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            {t(locale, "findings.all")} ({findings.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="issues" className="pt-3">
          <FindingList locale={locale} findings={issues} empty={t(locale, "findings.emptyIssues")} />
        </TabsContent>
        <TabsContent value="warnings" className="pt-3">
          <FindingList locale={locale} findings={warnings} empty={t(locale, "findings.emptyWarnings")} />
        </TabsContent>
        <TabsContent value="passed" className="pt-3">
          <FindingList locale={locale} findings={passed} empty={t(locale, "findings.emptyPassed")} />
        </TabsContent>
        <TabsContent value="all" className="pt-3">
          <FindingList locale={locale} findings={findings} empty={t(locale, "findings.emptyIssues")} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export function FindingList({
  locale,
  findings,
  empty,
  compact = false,
}: {
  locale: Locale;
  findings: Finding[];
  empty: string;
  compact?: boolean;
}) {
  if (findings.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2">
      {findings.map((finding) => (
        <li
          key={finding.id}
          className={cn(
            "rounded-xl bg-white p-3 ring-1",
            finding.status === "pass" && "ring-emerald-100",
            finding.status === "fail" && finding.severity === "error" && "ring-rose-200",
            finding.status === "fail" && finding.severity === "warning" && "ring-amber-200",
          )}
        >
          <p className="text-sm">{explainFinding(locale, finding)}</p>
          {!compact ? (
            <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground/80">{t(locale, "findings.trace")}</p>
              {finding.file ? (
                <p>
                  {t(locale, "findings.file")}: <span className="font-mono">{finding.file}</span>
                </p>
              ) : null}
              <p>
                {t(locale, "findings.rule")}: {pick(finding.ruleTitle, locale)}
              </p>
              <p>
                {t(locale, "findings.document")}: <span className="font-mono">{finding.sourceDocument}</span>
              </p>
              <p className="italic">“{pick(finding.sourceExcerpt, locale)}”</p>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
