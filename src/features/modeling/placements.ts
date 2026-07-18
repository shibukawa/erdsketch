import type { CanvasModelPlacement } from "./types";

export function normalizePlacementOwnership(placements: CanvasModelPlacement[]) {
  const ownerIndexBySeed = new Map<string, number>();
  const firstIndexBySeed = new Map<string, number>();
  for (const [index, placement] of placements.entries()) {
    if (!firstIndexBySeed.has(placement.seedId)) firstIndexBySeed.set(placement.seedId, index);
    if (placement.accessMode === "owner" && !ownerIndexBySeed.has(placement.seedId)) ownerIndexBySeed.set(placement.seedId, index);
  }
  for (const [seedId, index] of firstIndexBySeed) if (!ownerIndexBySeed.has(seedId)) ownerIndexBySeed.set(seedId, index);
  return placements.map((placement, index) => ({
    ...placement,
    accessMode: ownerIndexBySeed.get(placement.seedId) === index ? "owner" as const : "readonly" as const
  }));
}
