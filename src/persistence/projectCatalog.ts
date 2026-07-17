import { getAppDirectory, removeProjectDirectory, readText, writeText } from "./opfs";

const FORMAT_VERSION = 1;
const CATALOG_FILE = "catalog.json";
const PREVIOUS_CATALOG_FILE = "catalog.previous.json";
const LEGACY_PROJECT_ID = "default";

export type OpfsProjectKind = "named" | "temporary";

export type OpfsProject = {
  projectId: string;
  displayName: string;
  kind: OpfsProjectKind;
  createdAt: string;
  updatedAt: string;
};

type ProjectCatalogDocument = {
  formatVersion: 1;
  activeProjectId: string;
  projects: OpfsProject[];
};

function now() {
  return new Date().toISOString();
}

function normalizeName(displayName: string) {
  const normalized = displayName.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("Project name is required");
  if (normalized.length > 100) throw new Error("Project name must be 100 characters or fewer");
  return normalized;
}

function temporaryProject(projectId: string = crypto.randomUUID()): OpfsProject {
  const timestamp = now();
  return { projectId, displayName: "Untitled project", kind: "temporary", createdAt: timestamp, updatedAt: timestamp };
}

function parseCatalog(text: string): ProjectCatalogDocument {
  const parsed = JSON.parse(text) as ProjectCatalogDocument;
  if (parsed.formatVersion !== FORMAT_VERSION || !Array.isArray(parsed.projects) || typeof parsed.activeProjectId !== "string") throw new Error("Invalid OPFS project catalog");
  const ids = new Set<string>();
  for (const project of parsed.projects) {
    const invalidID = !project.projectId || project.projectId === "." || project.projectId === ".." || /[/\\\0]/.test(project.projectId);
    if (invalidID || ids.has(project.projectId) || !project.displayName || !["named", "temporary"].includes(project.kind) || typeof project.createdAt !== "string" || typeof project.updatedAt !== "string") throw new Error("Invalid OPFS project catalog entry");
    ids.add(project.projectId);
  }
  if (!ids.has(parsed.activeProjectId)) throw new Error("Active OPFS project is missing");
  return parsed;
}

export class ProjectCatalog {
  private constructor(private readonly directory: FileSystemDirectoryHandle, private document: ProjectCatalogDocument) {}

  static async open() {
    const directory = await getAppDirectory();
    const text = await readText(directory, CATALOG_FILE);
    if (text) {
      try {
        return new ProjectCatalog(directory, parseCatalog(text));
      } catch {
        const previousText = await readText(directory, PREVIOUS_CATALOG_FILE);
        if (!previousText) throw new Error("OPFS project catalog cannot be recovered");
        const previous = parseCatalog(previousText);
        await writeText(directory, CATALOG_FILE, JSON.stringify(previous));
        return new ProjectCatalog(directory, previous);
      }
    }
    const legacy = temporaryProject(LEGACY_PROJECT_ID);
    const catalog = new ProjectCatalog(directory, { formatVersion: FORMAT_VERSION, activeProjectId: legacy.projectId, projects: [legacy] });
    await catalog.persist();
    return catalog;
  }

  list() {
    return [...this.document.projects].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  active() {
    const project = this.document.projects.find((candidate) => candidate.projectId === this.document.activeProjectId);
    if (!project) throw new Error("Active OPFS project is missing");
    return project;
  }

  async createNamed(displayName: string) {
    return this.create(normalizeName(displayName), "named");
  }

  async createTemporary(displayName = "Untitled project") {
    return this.create(normalizeName(displayName), "temporary");
  }

  async setActive(projectId: string) {
    if (!this.document.projects.some((project) => project.projectId === projectId)) throw new Error("OPFS project was not found");
    const previous = this.document;
    this.document = { ...previous, activeProjectId: projectId };
    await this.persistOrRestore(previous);
    return this.active();
  }

  async rename(projectId: string, displayName: string) {
    const normalized = normalizeName(displayName);
    const timestamp = now();
    const previous = this.document;
    let found = false;
    const projects = previous.projects.map((project) => {
      if (project.projectId !== projectId) return project;
      found = true;
      return { ...project, displayName: normalized, kind: "named" as const, updatedAt: timestamp };
    });
    if (!found) throw new Error("OPFS project was not found");
    this.document = { ...previous, projects };
    await this.persistOrRestore(previous);
    return this.document.projects.find((project) => project.projectId === projectId)!;
  }

  async touch(projectId: string) {
    const timestamp = now();
    const previous = this.document;
    this.document = { ...previous, projects: previous.projects.map((project) => project.projectId === projectId ? { ...project, updatedAt: timestamp } : project) };
    await this.persistOrRestore(previous);
  }

  async delete(projectId: string) {
    if (!this.document.projects.some((project) => project.projectId === projectId)) throw new Error("OPFS project was not found");
    if (this.document.activeProjectId === projectId) throw new Error("Switch away from the active project before deleting it");
    await removeProjectDirectory(projectId);
    const previous = this.document;
    this.document = { ...previous, projects: previous.projects.filter((project) => project.projectId !== projectId) };
    await this.persistOrRestore(previous);
  }

  private async create(displayName: string, kind: OpfsProjectKind) {
    const timestamp = now();
    const project: OpfsProject = { projectId: crypto.randomUUID(), displayName, kind, createdAt: timestamp, updatedAt: timestamp };
    const previous = this.document;
    this.document = { ...previous, projects: [...previous.projects, project] };
    await this.persistOrRestore(previous);
    return project;
  }

  private async persist() {
    const current = await readText(this.directory, CATALOG_FILE);
    if (current) {
      try {
        parseCatalog(current);
        await writeText(this.directory, PREVIOUS_CATALOG_FILE, current);
      } catch {
        // Never replace a valid previous generation with a corrupt catalog.
      }
    }
    await writeText(this.directory, CATALOG_FILE, JSON.stringify(this.document));
  }

  private async persistOrRestore(previous: ProjectCatalogDocument) {
    try {
      await this.persist();
    } catch (error) {
      this.document = previous;
      throw error;
    }
  }
}
