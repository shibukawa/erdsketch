import type { NameSet, VocabularyEntry } from "./types";
import { deterministicSuggestion } from "./vocabulary";

type LanguageModelSession = {
  prompt(input: string, options?: { responseConstraint?: unknown; omitResponseConstraintInput?: boolean }): Promise<string>;
  destroy?(): void;
};

type LanguageModelAPI = {
  availability(options?: unknown): Promise<string>;
  create(options?: unknown): Promise<LanguageModelSession>;
};

const suggestionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    system: { type: "string" },
    physical: { type: "string" },
    rationale: { type: "string" }
  },
  required: ["system", "physical", "rationale"]
};

export type VocabularySuggestion = Pick<NameSet, "system" | "physical"> & {
  rationale: string;
  source: "browser-ai" | "rule";
};

export async function suggestVocabularyNames(business: string, entries: VocabularyEntry[], currentEntryId?: string): Promise<VocabularySuggestion> {
  const fallback = deterministicSuggestion(business);
  const candidates = entries.filter((entry) => entry.id !== currentEntryId);
  const known = candidates.find((entry) => entry.businessName.toLocaleLowerCase() === business.trim().toLocaleLowerCase());
  if (known) {
    return { system: known.systemName, physical: known.physicalName, rationale: "Reused a confirmed project vocabulary entry.", source: "rule" };
  }
  const languageModel = (globalThis as typeof globalThis & { LanguageModel?: LanguageModelAPI }).LanguageModel;
  if (!languageModel) return { ...fallback, rationale: "Generated from the project snake_case naming rule.", source: "rule" };

  try {
    const availability = await languageModel.availability({
      expectedInputs: [{ type: "text", languages: ["en", "ja"] }],
      expectedOutputs: [{ type: "text", languages: ["en", "ja"] }]
    });
    if (availability === "unavailable") return { ...fallback, rationale: "Generated from the project snake_case naming rule.", source: "rule" };
    const session = await languageModel.create({
      expectedInputs: [{ type: "text", languages: ["en", "ja"] }],
      expectedOutputs: [{ type: "text", languages: ["en", "ja"] }]
    });
    const related = candidates.slice(0, 30).map((entry) => `${entry.businessName} | ${entry.systemName} | ${entry.physicalName}`).join("\n");
    const response = await session.prompt(
      `Suggest a formal system name and SQL snake_case physical name for the business term: ${business}\nRelated project vocabulary:\n${related}`,
      { responseConstraint: suggestionSchema, omitResponseConstraintInput: true }
    );
    session.destroy?.();
    const parsed = JSON.parse(response) as { system: string; physical: string; rationale: string };
    if (!parsed.system?.trim() || !parsed.physical?.trim()) throw new Error("empty suggestion");
    return { system: parsed.system.trim(), physical: parsed.physical.trim(), rationale: parsed.rationale, source: "browser-ai" };
  } catch {
    return { ...fallback, rationale: "Browser AI was unavailable; generated from the project snake_case naming rule.", source: "rule" };
  }
}
