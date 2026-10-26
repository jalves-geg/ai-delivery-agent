"use client";

import { useRef, useState, type ReactNode } from "react";
import { FileText, FolderOpen, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { t, type MessageKey } from "@/lib/i18n";
import { FILE_ROLES, type FileRole, type Locale, type ParsedFile } from "@/lib/types";
import { cn } from "cn";

export function InputsPanel({
  locale,
  files,
  request,
  busy,
  onRequest,
  onLoadSample,
  onAddFiles,
  onRemove,
  onRole,
  onPropose,
  onReset,
}: {
  locale: Locale;
  files: ParsedFile[];
  request: string;
  busy: string | null;
  onRequest: (value: string) => void;
  onLoadSample: () => void;
  onAddFiles: (zone: "rules" | "package", files: File[]) => void;
  onRemove: (id: string) => void;
  onRole: (id: string, role: FileRole) => void;
  onPropose: () => void;
  onReset: () => void;
}) {
  const rules = files.filter((file) => file.role === "rules");
  const pkg = files.filter((file) => file.role !== "rules");
  const parsing = busy === "parse" || busy === "sample";

  return (
    <Card className="h-fit bg-white/90">
      <CardHeader>
        <CardTitle>{t(locale, "inputs.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onLoadSample} disabled={Boolean(busy)}>
            {busy === "sample" ? t(locale, "inputs.loadingSample") : t(locale, "inputs.loadSample")}
          </Button>
          <Button type="button" variant="outline" onClick={onReset} disabled={Boolean(busy) || files.length === 0}>
            {t(locale, "inputs.reset")}
          </Button>
        </div>

        <Dropzone
          locale={locale}
          title={t(locale, "inputs.documents")}
          hint={t(locale, "inputs.documentsHint")}
          icon={<FileText className="size-4" />}
          disabled={Boolean(busy)}
          onFiles={(list) => onAddFiles("rules", list)}
        />
        <FileList locale={locale} files={rules} onRemove={onRemove} onRole={onRole} />

        <Dropzone
          locale={locale}
          title={t(locale, "inputs.package")}
          hint={t(locale, "inputs.packageHint")}
          icon={<FolderOpen className="size-4" />}
          disabled={Boolean(busy)}
          onFiles={(list) => onAddFiles("package", list)}
        />
        <FileList locale={locale} files={pkg} onRemove={onRemove} onRole={onRole} />

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t(locale, "inputs.request")}
          <Textarea
            value={request}
            onChange={(event) => onRequest(event.target.value)}
            placeholder={t(locale, "inputs.requestPlaceholder")}
            rows={4}
          />
        </label>

        <Button type="button" size="lg" onClick={onPropose} disabled={Boolean(busy) || rules.length === 0}>
          {busy === "propose" ? t(locale, "inputs.proposing") : t(locale, "inputs.propose")}
        </Button>
        {parsing ? <p className="text-xs text-muted-foreground">{t(locale, "inputs.parsing")}</p> : null}
      </CardContent>
    </Card>
  );
}

function Dropzone({
  locale,
  title,
  hint,
  icon,
  disabled,
  onFiles,
}: {
  locale: Locale;
  title: string;
  hint: string;
  icon: ReactNode;
  disabled: boolean;
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!disabled) onFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "rounded-xl border border-dashed border-border bg-muted/40 p-3",
        over && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t(locale, "inputs.drop")}</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {t(locale, "inputs.browse")}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        accept=".pdf,.docx,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt,.dwg"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}

function FileList({
  locale,
  files,
  onRemove,
  onRole,
}: {
  locale: Locale;
  files: ParsedFile[];
  onRemove: (id: string) => void;
  onRole: (id: string, role: FileRole) => void;
}) {
  if (files.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {files.map((file) => (
        <li key={file.id} className="rounded-xl bg-muted/50 p-2 ring-1 ring-border">
          <div className="flex items-start gap-2">
            {file.dataUrl ? (
              // Data URLs from the user's own upload; next/image does not optimize them.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.dataUrl} alt={file.name} className="size-10 rounded-md object-cover" />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-md bg-white text-muted-foreground ring-1 ring-border">
                {file.role === "image" ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[11px] font-medium" title={file.name}>
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <button
              type="button"
              aria-label={t(locale, "inputs.remove")}
              onClick={() => onRemove(file.id)}
              className="rounded-md p-1 text-muted-foreground hover:bg-white hover:text-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            {t(locale, "inputs.role")}
            <select
              value={file.role}
              onChange={(event) => onRole(file.id, event.target.value as FileRole)}
              className="h-7 flex-1 rounded-md border border-input bg-white px-1.5 text-xs text-foreground"
            >
              {FILE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(locale, `roles.${role}` as MessageKey)}
                </option>
              ))}
            </select>
          </label>
          {file.parseWarning ? (
            <p className="mt-1 text-[11px] text-destructive">{t(locale, "inputs.parseWarning")}</p>
          ) : null}
          {file.role === "image" ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{t(locale, "inputs.imageNote")}</p>
          ) : (
            <details className="mt-1">
              <summary className="cursor-pointer text-[11px] text-muted-foreground">{t(locale, "inputs.extracted")}</summary>
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-foreground/80">
                {file.text.trim() ? file.text.slice(0, 700) : t(locale, "inputs.noText")}
              </pre>
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
