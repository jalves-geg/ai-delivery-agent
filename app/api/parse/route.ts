import { inferRole, parseBuffer, UPLOAD_LIMITS } from "@/lib/documents/parse";
import { jsonError } from "@/lib/api";
import type { ParsedFile } from "@/lib/types";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("parse", 400);
  }
  const rules = form.getAll("rules").filter((item): item is File => item instanceof File);
  const pkg = form.getAll("package").filter((item): item is File => item instanceof File);
  const incoming = [
    ...rules.map((file) => ({ file, zone: "rules" as const })),
    ...pkg.map((file) => ({ file, zone: "package" as const })),
  ];
  if (incoming.length > UPLOAD_LIMITS.maxFiles) return jsonError("too_many_files", 400);
  const files: ParsedFile[] = [];
  for (const item of incoming) {
    if (item.file.size > UPLOAD_LIMITS.maxBytes) {
      return jsonError("file_too_large", 400, { name: item.file.name });
    }
    const buffer = Buffer.from(await item.file.arrayBuffer());
    files.push(
      await parseBuffer({
        name: item.file.name,
        buffer,
        role: inferRole(item.file.name, item.zone),
        origin: "upload",
      }),
    );
  }
  return Response.json({ files });
}
