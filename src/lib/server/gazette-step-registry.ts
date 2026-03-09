export type GazetteStepProvider = "deterministic" | "openai" | "anthropic";
export type GazetteStepKey =
  | "scout_brief"
  | "telemetry_research"
  | "author_draft"
  | "editor_validation"
  | "persist_article";

export type GazetteStepConfig = {
  provider: GazetteStepProvider;
  modelName: string | null;
  promptVersion: string | null;
};

export function getGazetteStepConfig(stepKey: GazetteStepKey): GazetteStepConfig {
  switch (stepKey) {
    case "author_draft":
      return {
        provider: (process.env.GAZETTE_AUTHOR_PROVIDER?.trim().toLowerCase() as GazetteStepProvider | undefined) ?? "openai",
        modelName: process.env.GAZETTE_AUTHOR_MODEL?.trim() || "gpt-4.1-mini",
        promptVersion: "gazette_daily_author_v1",
      };
    case "scout_brief":
    case "telemetry_research":
    case "editor_validation":
    case "persist_article":
    default:
      return {
        provider: "deterministic",
        modelName: null,
        promptVersion: null,
      };
  }
}
