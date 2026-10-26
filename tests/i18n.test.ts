import { describe, expect, it } from "vitest";
import { en, pt, t } from "@/lib/i18n";

describe("dictionaries", () => {
  it("covers every English key in Portuguese", () => {
    const missing = Object.keys(en).filter((key) => !(key in pt) || !pt[key as keyof typeof pt]);
    expect(missing).toEqual([]);
  });

  it("keeps the same placeholders in both languages", () => {
    const placeholders = (value: string) => [...value.matchAll(/\{([a-zA-Z0-9]+)\}/g)].map((match) => match[1]).sort();
    const mismatches = Object.keys(en).filter((key) => {
      const typed = key as keyof typeof en;
      return placeholders(en[typed]).join() !== placeholders(pt[typed]).join();
    });
    expect(mismatches).toEqual([]);
  });

  it("interpolates counts", () => {
    expect(t("en", "rules.progress", { decided: 2, total: 5 })).toBe("2 of 5 decided");
    expect(t("pt", "decision.notReady")).toBe("Não pronto");
  });
});
