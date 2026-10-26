import { baseResult } from "./meta";
import { SUBMISSION_PROMPT } from "./prompts";
import type { AgentModule } from "./types";

export const submissionBot: AgentModule = {
  id: "submission",
  mvp: true,
  systemPrompt: SUBMISSION_PROMPT,
  async run() {
    return baseResult("submission", "done", true, {
      summaryKey: "bots.submission.readySummary",
    });
  },
};
