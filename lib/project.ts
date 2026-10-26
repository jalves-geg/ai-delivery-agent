import { l10n, type L10n, type ProjectInfo } from "./types";

export const DEMO_PROJECT: ProjectInfo = {
  name: l10n("Oxagon Utility Building UB-04", "Edifício de utilidades Oxagon UB-04"),
  code: "UB-04",
  client: "NEOM",
  originator: "GEG",
  stage: l10n("Stage 3 design submission", "Submissão de projeto — fase 3"),
};

export const SAMPLE_REQUEST: L10n = l10n(
  "Prepare the UB-04 utility building package for a NEOM-style Stage 3 design submission. Check file naming, completeness, revisions and format against the PRC, BEP and project requirements, then generate the submission form.",
  "Preparar o pacote do edifício de utilidades UB-04 para uma submissão de projeto ao estilo NEOM, fase 3. Verificar a nomenclatura, a completude, as revisões e o formato face ao PRC, ao BEP e aos requisitos do projeto, e gerar o formulário de submissão.",
);

export const DEMO_MARKERS = [
  "GEG-NEOM-UB04-<DISC>-<TYPE>-<REV>.pdf",
  "Oxagon Utility Building UB-04",
];
