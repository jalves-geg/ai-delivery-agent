"use client";

import { t, type MessageKey } from "@/lib/i18n";
import type { Locale, StepId } from "@/lib/types";
import { cn } from "cn";

const STEPS: { id: StepId; label: MessageKey }[] = [
  { id: "receive", label: "steps.receive" },
  { id: "approve", label: "steps.approve" },
  { id: "distribute", label: "steps.distribute" },
  { id: "consolidate", label: "steps.consolidate" },
  { id: "decide", label: "steps.decide" },
];

export function FlowStepper({
  locale,
  step,
  unlocked,
  onStep,
}: {
  locale: Locale;
  step: StepId;
  unlocked: Record<StepId, boolean>;
  onStep: (step: StepId) => void;
}) {
  return (
    <nav aria-label={t(locale, "flow.caption")} className="overflow-x-auto">
      <ol className="flex min-w-[720px] items-center gap-2">
        {STEPS.map((item, index) => {
          const current = item.id === step;
          const available = unlocked[item.id];
          return (
            <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                disabled={!available}
                aria-current={current ? "step" : undefined}
                onClick={() => onStep(item.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-2 py-2 text-left transition-colors",
                  current && "bg-white shadow-sm ring-1 ring-primary/30",
                  !current && available && "hover:bg-white/70",
                  !available && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    current ? "bg-primary text-primary-foreground" : "bg-white text-foreground ring-1 ring-border",
                  )}
                >
                  {index + 1}
                </span>
                <span className="truncate text-xs font-medium sm:text-sm">{t(locale, item.label)}</span>
              </button>
              {index < STEPS.length - 1 ? <span className="hidden h-px w-3 bg-border sm:block" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
