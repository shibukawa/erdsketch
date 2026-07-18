import type { DataDomain, DfdState, ModelSeed, Relationship, RelationshipReference } from "../modeling/types";

export type AiProviderId = "browser" | "local-openai";

export type LocalOpenAiConfig = {
  baseUrl: string;
  model: string;
};

export type AiSurfaceContext = {
  kind: "erd-canvas" | "dfd-canvas" | "dialog";
  id: string;
  title: string;
  selectedModelIds?: string[];
  selectedAttributeIds?: string[];
  selectedProcessOrFlowIds?: string[];
};

export type AiWorkspaceSource = {
  project: { id?: string; name: string };
  activeCanvas: { id: string; name: string; kind: "erd" | "dfd" };
  canvasModelIds: string[];
  models: ModelSeed[];
  domains: DataDomain[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  dfd: DfdState;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export type AiDesignSuggestion = {
  id: string;
  kind: "field_type" | "model_split" | "model_quality";
  targetIds: string[];
  title: string;
  rationale: string;
  proposedValue?: string;
  tradeoffs: string[];
  alternatives: string[];
};

export type AiAssistantReply = {
  text: string;
  suggestions: AiDesignSuggestion[];
};

export type AiProviderRequest = {
  instruction: string;
  history: AiChatMessage[];
  context: unknown;
  signal: AbortSignal;
  onProgress?: (text: string) => void;
};

export type AiProviderTestResult = {
  message: string;
  models?: string[];
};

export type AiProvider = {
  id: AiProviderId;
  label: string;
  modelLabel: string;
  generate(request: AiProviderRequest): Promise<AiAssistantReply>;
  test(signal: AbortSignal): Promise<AiProviderTestResult>;
};
