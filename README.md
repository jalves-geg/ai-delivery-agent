# AI Delivery Agent

Multi-agent MVP for engineering delivery validation and preparation. A GEG user uploads project documents and a drawing package, approves the rules the Requirements Bot proposes, and the Lead Bot decides whether the package is **Ready** or **Not ready**. The Submission Bot then writes a NEOM-style submission form.

The screen follows the hackathon architecture: inputs, Requirements Bot, human approval, Process QA, Lead Bot, Submission Bot, and an outputs panel. Drawing QA and Specifications are on the board as stubs.

## Stack

- Next.js (App Router) and React
- TypeScript
- Tailwind CSS and shadcn/ui
- Document reading: `unpdf`, `mammoth`, SheetJS (`xlsx`)
- Submission file: `docx`
- LLM calls go through one adapter in `lib/llm`. Demo mode needs no key.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

With no API key the app stays in **demo mode**. Click **Load sample package** and walk the five steps. Tests:

```bash
npm test
```

Regenerate the sample files (they are already committed) with `npm run generate-samples`.

## Demo, without an API key

The sample is a fictional Stage 3 issue for **Oxagon Utility Building UB-04** (client NEOM, originator GEG).

| File | Role |
| --- | --- |
| `PRC-LOD-UB04.docx` | Rules — format and LOD |
| `BEP-Contract-Excerpt.docx` | Rules — naming, revisions, transmittal |
| `Project-Requirements.docx` | Rules — required drawing names |
| `GEG-NEOM-UB04-ARC-PLN-P02.pdf` | Drawing, conforms |
| `GEG-NEOM-UB04-STR-SEC-P01.pdf` | Drawing, conforms |
| `ub04_mep_draft.pdf` | Drawing, bad name and a draft token |
| `GEG-NEOM-UB04-ARC-DET-P02.docx` | Drawing issued as DOCX |
| `Transmittal-UB04.xlsx` | Lists files that are not in the package |
| `MEP-Narrative.docx` | Narrative for the future Specifications Bot |
| `UB04-site-photo.png` | Image. Counted in the file set, not OCR'd |

If every proposed rule is approved, the decision is **Not ready**. Traceability on each finding names the file, the rule, and the source sentence. Reject the blocking rules (or edit a pattern) and run again: warnings alone leave the package **Ready**. Download the `.docx`, switch the language, and download again — the form follows the language on screen.

Images are accepted and checked as files. This MVP does not read text out of images.

## Flow

1. **Receive** — project documents, the delivery package, and the GEG request.
2. **Human approval** — Approve, Edit, or Reject each proposed rule. Rejected rules are not checked. Nothing runs before this.
3. **Distribute** — Lead Bot sends the approved process rules to Process QA. Optional stubs can be included.
4. **Consolidate** — findings, with source and traceability.
5. **Decide** — Ready / Not ready, then the submission document.

Process QA does not ask the model to invent pass/fail. It executes the approved checks (name pattern, required files, extensions, forbidden tokens, revision pattern, transmittal match). In live mode the model writes that bot's summary. The Lead Bot's ready/not-ready flag is computed from blocking findings; in live mode the model writes the rationale and cannot flip the flag. The submission cover note is templated in demo mode and written by the model in live mode, in the active language.

## Architecture

```text
Inputs
  project documents + package + user request
        │
        v
Requirements Bot  ── proposed rules ──►  Human approval
                                              │ approved rules
        ┌─────────────────────────────────────┼─────────────────────┐
        v                                     v                     v
 Process QA Bot                        Drawing QA (stub)     Specifications (stub)
 naming, files, revisions, format            │                     │
        └──────────────────► Lead Bot ◄──────┴─────────────────────┘
                             consolidates, decides
                                   │
                                   v
                            Submission Bot  ──►  .docx
                                   │
                                   v
Outputs: Ready / Not ready, issues, warnings, traceability, download
```

| Bot | MVP | What it does |
| --- | --- | --- |
| Requirements | Yes | Reads PRC/LOD, BEP/contract and project requirements. Proposes structured rules. |
| Human approval | Yes | GUI. Not a model. |
| Process QA | Yes | Runs approved naming, file, revision and format checks. |
| Lead | Yes | Orders the run, consolidates findings, decides Ready / Not ready. |
| Submission | Yes | Builds the downloadable submission form. |
| Drawing QA | Stub | Card, prompt, and model slot exist. It does not inspect drawing content. |
| Specifications | Stub | Card, prompt, and model slot exist. It does not read narratives yet. |

Prompts live next to each bot in `lib/agents/`. The registry is `lib/agents/registry.ts`. The pipeline is `lib/orchestrate.ts`.

## LLM providers

The default provider is **xAI**. Calls use the OpenAI-compatible Chat Completions API at `https://api.x.ai/v1` and the default model **`grok-4.7`**. Copy `.env.example` to `.env.local` and set a key from [console.x.ai](https://console.x.ai):

```bash
LLM_PROVIDER=xai
LLM_BASE_URL=https://api.x.ai/v1
LLM_MODEL=grok-4.7
LLM_API_KEY=your-xai-key
```

`LLM_MODE=auto` (the default) uses the provider when `LLM_API_KEY` is set, and demo mode when it is not. `mock` never calls the network. `live` fails clearly if the key is missing.

The adapter is `lib/llm`. Agents call `completeJson` and do not know which vendor is behind it. Supported `LLM_PROVIDER` values:

| Provider | Request shape | Default base URL | Default model |
| --- | --- | --- | --- |
| `xai` | OpenAI-compatible chat completions | `https://api.x.ai/v1` | `grok-4.7` |
| `openai` | OpenAI-compatible | `https://api.openai.com/v1` | `gpt-4o-mini` |
| `openai-compatible` | OpenAI-compatible | `http://127.0.0.1:11434/v1` | `llama3.1` |
| `local` | OpenAI-compatible (same as a local server such as Ollama) | `http://127.0.0.1:11434/v1` | `llama3.1` |
| `azure-openai` | Azure deployment URL, `api-key` header | set `LLM_BASE_URL` | deployment name |
| `anthropic` | Messages API, `x-api-key` and `anthropic-version` | `https://api.anthropic.com` | `claude-sonnet-4-5` |

Examples:

```bash
# OpenAI
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...

# Anthropic. ANTHROPIC_API_KEY wins over LLM_API_KEY when both are set.
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-5
ANTHROPIC_API_KEY=sk-ant-...

# Azure OpenAI
LLM_PROVIDER=azure-openai
LLM_BASE_URL=https://YOUR_RESOURCE.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment
AZURE_OPENAI_API_VERSION=2024-10-21
LLM_API_KEY=your-azure-key

# Local OpenAI-compatible server
LLM_PROVIDER=local
LLM_BASE_URL=http://127.0.0.1:11434/v1
LLM_MODEL=llama3.1
LLM_API_KEY=local
LLM_JSON_MODE=prompt
```

Set `LLM_MODEL` for every bot, then override one bot without touching the others:

```bash
LLM_MODEL=grok-4.7
LLM_MODEL_LEAD=grok-4.5
LLM_MODEL_REQUIREMENTS=grok-4.7
LLM_MODEL_PROCESS_QA=grok-4.6
LLM_MODEL_SUBMISSION=grok-4.7
```

Env names: `LLM_MODEL_LEAD`, `LLM_MODEL_REQUIREMENTS`, `LLM_MODEL_PROCESS_QA`, `LLM_MODEL_DRAWING_QA`, `LLM_MODEL_SPECIFICATIONS`, `LLM_MODEL_SUBMISSION`.

OpenAI-compatible providers send `response_format: { type: "json_object" }`. Anthropic does not; the prompt asks for JSON. If a local model rejects JSON mode, set `LLM_JSON_MODE=prompt`.

The header pill shows **Demo** or `provider · model`, and the per-bot model list. The API key never leaves the server. `GET /api/config` returns the public config only.

## Languages

The interface, finding text, decision, and submission document are in **English** and **Portuguese (Portugal)**. The switcher is in the header. Structured findings store a message code, so the list changes language without a new run. Demo rules ship with both languages. Source excerpts stay in the language of the document (the sample documents are English). In live mode, bot prose is requested in the language selected when that bot runs; the counts sentence underneath still follows the switcher.

Add a language:

1. Add its code to `LOCALES` in `lib/types.ts` (`export const LOCALES = ["en", "pt", "fr"] as const`). `Locale` updates with it.
2. Copy `lib/i18n/en.ts` to `lib/i18n/fr.ts`, translate every value, and give it the type `Dictionary`.
3. Register it in `dictionaries` in `lib/i18n/index.ts`.
4. Add a `case` in `languageName()` in that file so model prompts name the language.
5. Add endonyms next to `language.en` / `language.pt`, and a short code for the switcher (`language.shortEn`). The switcher reads `LOCALES`, so it picks the new code up once those strings exist.
6. Optional: add `fr` strings on demo rules in `lib/samples/rules.ts`. Missing translations fall back to English.

`npm test` checks that every English key exists in Portuguese and that `{placeholders}` match.

## Add a bot

Drawing QA (`lib/agents/drawing-qa.ts`) and Specifications (`lib/agents/specifications.ts`) are the templates. Each file exports an `AgentModule`: an id, `mvp`, a system prompt, and `run(ctx)`.

1. Copy `lib/agents/drawing-qa.ts` to `lib/agents/your-bot.ts`.
2. Set `mvp: true` and replace `run`. Use `completeJson` from `lib/llm` for a model call — pass `bot: "your-bot"` only after the id exists on `BotId`. Return `findings` that point at real files and approved rules. Write prose in `ctx.locale` (see `withLanguage` in `lib/agents/prompts.ts`).
3. Add the id to `BOT_IDS` in `lib/types.ts` and a `LLM_MODEL_...` entry in `lib/llm/config.ts`.
4. Register the module in `lib/agents/registry.ts`. `runPipeline` in `lib/orchestrate.ts` already calls agents by id; call yours from there and merge its findings before `decide()`. Findings with severity `error` block Ready. Warnings do not.
5. Add display strings under `bots.yourBot` in `lib/i18n/en.ts` and `lib/i18n/pt.ts`, and a card in `components/agent-map.tsx`.

Rules already have categories `drawing` and `specification`. Process QA ignores those categories, so a new bot can own them.

Keep checks deterministic when a pass/fail must be explainable. The model is a good fit for proposing rules and writing the summary, the rationale, and the cover note.

## Project layout

```text
app/                    pages and route handlers
components/             workbench, rules, findings, agent map
lib/agents/             one module per bot, plus prompts and the registry
lib/checks/             deterministic process checks
lib/llm/                provider adapter and config
lib/i18n/               English and Portuguese
lib/documents/parse.ts  PDF, DOCX, XLSX, images
lib/submission/docx.ts  submission form
lib/orchestrate.ts      distribute → consolidate → decide
samples/                demo package
tests/                  checks, languages, adapter, sample package
```

## API

| Route | Purpose |
| --- | --- |
| `GET /api/config` | Public provider, mode, and per-bot models |
| `GET /api/samples` | Parsed demo package and the sample request in both languages |
| `POST /api/parse` | Multipart `rules` and `package` files |
| `POST /api/requirements` | Propose rules |
| `POST /api/run` | Run approved checks and decide |
| `POST /api/submission` | Download the `.docx` |

## What is stubbed

- **Drawing QA** — no reading of drawing content, consistency, dimensions, or notes.
- **Specifications** — no reading of narratives, specifications, or technical documents.
- **Image text** — photos are part of the file-set checks only.
- **Live extraction of your own documents** needs an API key. Demo mode recognises the sample corpus and will say so if the documents are something else.
