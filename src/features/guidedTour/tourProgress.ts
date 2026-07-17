export type GuidedTourOutcome = "completed" | "skipped";

export type GuidedTourProgress = {
  surfaceId: string;
  guideVersion: number;
  outcome: GuidedTourOutcome;
  updatedAt: string;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const storagePrefix = "erdsketch.guided-tour";

export function guidedTourStorageKey(surfaceId: string, guideVersion: number): string {
  return `${storagePrefix}.${surfaceId}.v${guideVersion}`;
}

export function hasGuidedTourOutcome(storage: StorageLike, surfaceId: string, guideVersion: number): boolean {
  try {
    const value = storage.getItem(guidedTourStorageKey(surfaceId, guideVersion));
    if (!value) return false;
    const progress = JSON.parse(value) as Partial<GuidedTourProgress>;
    return progress.surfaceId === surfaceId
      && progress.guideVersion === guideVersion
      && (progress.outcome === "completed" || progress.outcome === "skipped");
  } catch {
    return false;
  }
}

export function saveGuidedTourOutcome(storage: StorageLike, surfaceId: string, guideVersion: number, outcome: GuidedTourOutcome): boolean {
  try {
    const progress: GuidedTourProgress = { surfaceId, guideVersion, outcome, updatedAt: new Date().toISOString() };
    storage.setItem(guidedTourStorageKey(surfaceId, guideVersion), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}
