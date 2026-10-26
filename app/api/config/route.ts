import { connection } from "next/server";
import { getLlmConfig, publicLlmConfig } from "@/lib/llm";
import { jsonError } from "@/lib/api";

export async function GET() {
  await connection();
  try {
    return Response.json(publicLlmConfig(getLlmConfig()));
  } catch (error) {
    return jsonError("config", 500, {
      detail: error instanceof Error ? error.message : "Config failed",
    });
  }
}
