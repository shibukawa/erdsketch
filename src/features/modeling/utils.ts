import type { ModelSeed } from "./types";

export const clampScale = (scale: number) => Math.min(2.4, Math.max(0.35, scale));

export const clampMaturedLevel = (maturedLevel: number) => Math.min(6, Math.max(0.5, maturedLevel));

export const getModelStageLabel = (maturedLevel: number) => {
  if (maturedLevel <= 0.5) return "MATURED MODEL";
  if (maturedLevel <= 1.25) return "LOGICAL MODEL";
  if (maturedLevel <= 3.5) return "CONCEPTUAL MODEL";
  return "MODEL SEED";
};

export function flattenLabels(seed: ModelSeed) {
  return [seed.dependency, seed.role, ...(seed.hasPrivacy ? ["privacy"] : [])];
}
