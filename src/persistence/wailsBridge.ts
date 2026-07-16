import type { ProjectDocumentSet } from "./projectDocument";

type SeedDocument = { path: string; text: string };

type WailsApp = {
  ListSeeds(): Promise<SeedDocument[]>;
  OpenProject(): Promise<ProjectDocumentSet | null>;
  SaveProject(documents: ProjectDocumentSet): Promise<void>;
};

declare global {
  interface Window {
    go?: {
      app?: {
        App?: WailsApp;
      };
    };
  }
}

export function wailsApp() {
  return window.go?.app?.App;
}

export function hasWailsBridge() {
  return wailsApp() !== undefined;
}
