import { connection } from "next/server";
import { jsonError } from "@/lib/api";
import { loadSamplePackage } from "@/lib/samples/load";

export async function GET() {
  await connection();
  try {
    const sample = await loadSamplePackage();
    return Response.json(sample);
  } catch (error) {
    return jsonError("samples", 500, {
      detail: error instanceof Error ? error.message : "Sample package is missing",
    });
  }
}
