import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { parse, stringify } from "yaml";
import type { DurableState } from "../collaboration/types";
import type { CanvasAnnotation } from "../features/annotations/types";
import type {
  CanvasModelPlacement,
  DataDomain,
  DfdCanvas,
  DfdFlow,
  DfdGroup,
  DfdNode,
  DomainCategory,
  ErdCanvas,
  ModelSeed,
  NamingPolicy,
  Relationship,
  RelationshipReference,
  VocabularyEntry
} from "../features/modeling/types";

const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const FORMAT_VERSION = 2 as const;
const MANAGED_ROOTS = new Set(["model", "erd", "dfd", "vocabulary", "domain"]);

export type ProjectDocumentSet = {
  formatVersion: typeof FORMAT_VERSION;
  projectId: string;
  documents: Record<string, string>;
};

type PersistedModel = ModelSeed & Record<string, unknown>;
type ProjectManifest = {
  format_version: typeof FORMAT_VERSION;
  project_id: string;
  naming_policy: NamingPolicy;
};
type Ordered<T> = T & { order: number };
type PersistedRelationship = { relationship: Relationship; reference: RelationshipReference };

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
  }
}

function yaml(value: unknown) {
  return stringify(value, { indent: 2, lineWidth: 0, sortMapEntries: true });
}

function fromYaml<T>(documents: Record<string, string>, path: string): T {
  const text = documents[path];
  if (typeof text !== "string") throw new Error(`Project document is missing: ${path}`);
  const value = parse(text) as T;
  if (!value || typeof value !== "object") throw new Error(`Project document is invalid: ${path}`);
  return value;
}

function without<T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> {
  const result = { ...value };
  for (const key of keys) delete result[key];
  return result;
}

function orderedValues<T>(values: Ordered<T>[]) {
  return values.sort((left, right) => left.order - right.order).map((value) => without(value, "order"));
}

function matching<T>(documents: Record<string, string>, pattern: RegExp) {
  return Object.keys(documents).sort().flatMap((path) => pattern.test(path) ? [fromYaml<T>(documents, path)] : []);
}

function assertSafePath(path: string) {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error(`Unsafe project document path: ${path}`);
  }
}

function storageId(value: { id?: string; timestamp?: string }) {
  if (!value.timestamp) throw new Error(`Project element has no host timestamp: ${value.id ?? "placement"}`);
  return value.timestamp;
}

export function createProjectDocumentSet<T>(projectId: string, state: DurableState<T>): ProjectDocumentSet {
  const project = state as unknown as DurableState<PersistedModel>;
  const documents: Record<string, string> = {};
  documents["project.yaml"] = yaml({ format_version: FORMAT_VERSION, project_id: projectId, naming_policy: project.namingPolicy } satisfies ProjectManifest);

  const erdDirectories = new Map(project.canvases.map((canvas) => [canvas.id, `erd/erd-${storageId(canvas)}`]));
  const dfdDirectories = new Map(project.dfd.canvases.map((canvas) => [canvas.id, `dfd/dfd-${storageId(canvas)}`]));
  for (const [index, canvas] of project.canvases.entries()) documents[`${erdDirectories.get(canvas.id)}/canvas.yaml`] = yaml({ ...canvas, order: index });
  for (const [index, placement] of project.placements.entries()) {
    const directory = erdDirectories.get(placement.canvasId);
    if (!directory) throw new Error(`ERD canvas is missing: ${placement.canvasId}`);
    documents[`${directory}/model-${storageId(placement)}.yaml`] = yaml({ ...placement, order: index });
  }
  for (const [index, relationship] of project.relationships.entries()) {
    const reference = project.relationshipReferences.find((item) => item.relationshipId === relationship.id);
    if (!reference) throw new Error(`Relationship reference is missing: ${relationship.id}`);
    documents[`erd/relation-${storageId(relationship)}.yaml`] = yaml({ relationship, reference, order: index });
  }

  for (const [index, model] of project.seeds.entries()) {
    const directory = `model/model-${storageId(model)}`;
    documents[`${directory}/model.yaml`] = yaml({ ...without(model, "fields"), order: index });
    for (const [fieldIndex, field] of model.fields.entries()) documents[`${directory}/field-${storageId(field)}.yaml`] = yaml({ ...field, order: fieldIndex });
  }

  for (const [index, canvas] of project.dfd.canvases.entries()) documents[`${dfdDirectories.get(canvas.id)}/canvas.yaml`] = yaml({ ...canvas, order: index });
  for (const [index, node] of project.dfd.nodes.entries()) {
    const prefix = node.kind === "external" ? "extentity" : node.kind === "intermediate" ? "datastore" : node.kind;
    const directory = dfdDirectories.get(node.canvasId);
    if (!directory) throw new Error(`DFD canvas is missing: ${node.canvasId}`);
    documents[`${directory}/${prefix}-${storageId(node)}.yaml`] = yaml({ ...node, order: index });
  }
  for (const [index, flow] of project.dfd.flows.entries()) {
    const directory = dfdDirectories.get(flow.canvasId);
    if (!directory) throw new Error(`DFD canvas is missing: ${flow.canvasId}`);
    documents[`${directory}/dataflow-${storageId(flow)}.yaml`] = yaml({ ...flow, order: index });
  }
  for (const [index, group] of project.dfd.groups.entries()) {
    const directory = dfdDirectories.get(group.canvasId);
    if (!directory) throw new Error(`DFD canvas is missing: ${group.canvasId}`);
    documents[`${directory}/group-${storageId(group)}.yaml`] = yaml({ ...group, order: index });
  }
  if (project.dfd.crudMatrix) documents["dfd/crud-matrix.yaml"] = yaml(project.dfd.crudMatrix);

  for (const [index, annotation] of project.annotations.entries()) {
    const directory = annotation.canvasType === "erd" ? erdDirectories.get(annotation.canvasId) : dfdDirectories.get(annotation.canvasId);
    if (!directory) throw new Error(`Annotation canvas is missing: ${annotation.canvasId}`);
    documents[`${directory}/annotation-${annotation.kind}-${storageId(annotation)}.yaml`] = yaml({ ...annotation, order: index });
  }
  for (const [index, category] of project.domainCategories.entries()) documents[`domain/category-${storageId(category)}.yaml`] = yaml({ ...category, order: index });
  for (const [index, domain] of project.domains.entries()) documents[`domain/domain-${storageId(domain)}.yaml`] = yaml({ ...domain, order: index });
  for (const [index, entry] of project.vocabularyEntries.entries()) documents[`vocabulary/vocabulary-${storageId(entry)}.yaml`] = yaml({ ...entry, order: index });

  return { formatVersion: FORMAT_VERSION, projectId, documents: Object.fromEntries(Object.entries(documents).sort(([left], [right]) => left.localeCompare(right))) };
}

export function readProjectDocumentSet<T>(documentSet: ProjectDocumentSet): DurableState<T> {
  if (documentSet.formatVersion !== FORMAT_VERSION || !documentSet.projectId || !documentSet.documents || typeof documentSet.documents !== "object") throw new Error("Invalid ERDSketch project");
  for (const path of Object.keys(documentSet.documents)) assertSafePath(path);
  const manifest = fromYaml<ProjectManifest>(documentSet.documents, "project.yaml");
  if (manifest.format_version !== FORMAT_VERSION || manifest.project_id !== documentSet.projectId) throw new Error("Project manifest is invalid");

  const modelDocuments = matching<Ordered<Omit<PersistedModel, "fields">>>(documentSet.documents, /^model\/[^/]+\/model\.yaml$/);
  const seeds = orderedValues(modelDocuments).map((model) => {
    const fields = orderedValues(matching<Ordered<ModelSeed["fields"][number]>>(documentSet.documents, new RegExp(`^model/model-${escapePattern(String(model.timestamp))}/field-[^/]+\\.yaml$`)));
    return { ...model, fields };
  });
  const relationshipDocuments = matching<Ordered<PersistedRelationship>>(documentSet.documents, /^erd\/relation-[^/]+\.yaml$/).sort((left, right) => left.order - right.order);
  const annotations = orderedValues([
    ...matching<Ordered<CanvasAnnotation>>(documentSet.documents, /^erd\/[^/]+\/annotation-[^/]+\.yaml$/),
    ...matching<Ordered<CanvasAnnotation>>(documentSet.documents, /^dfd\/[^/]+\/annotation-[^/]+\.yaml$/)
  ]);

  return {
    canvases: orderedValues(matching<Ordered<ErdCanvas>>(documentSet.documents, /^erd\/[^/]+\/canvas\.yaml$/)),
    placements: orderedValues(matching<Ordered<CanvasModelPlacement>>(documentSet.documents, /^erd\/[^/]+\/model-[^/]+\.yaml$/)),
    seeds: seeds as unknown as T[],
    relationships: relationshipDocuments.map((item) => item.relationship),
    relationshipReferences: relationshipDocuments.map((item) => item.reference),
    domains: orderedValues(matching<Ordered<DataDomain>>(documentSet.documents, /^domain\/domain-[^/]+\.yaml$/)),
    domainCategories: orderedValues(matching<Ordered<DomainCategory>>(documentSet.documents, /^domain\/category-[^/]+\.yaml$/)),
    namingPolicy: manifest.naming_policy,
    vocabularyEntries: orderedValues(matching<Ordered<VocabularyEntry>>(documentSet.documents, /^vocabulary\/vocabulary-[^/]+\.yaml$/)),
    dfd: {
      canvases: orderedValues(matching<Ordered<DfdCanvas>>(documentSet.documents, /^dfd\/[^/]+\/canvas\.yaml$/)),
      nodes: orderedValues(matching<Ordered<DfdNode>>(documentSet.documents, /^dfd\/[^/]+\/(?:extentity|datastore|model|process)-[^/]+\.yaml$/)),
      flows: orderedValues(matching<Ordered<DfdFlow>>(documentSet.documents, /^dfd\/[^/]+\/dataflow-[^/]+\.yaml$/)),
      groups: orderedValues(matching<Ordered<DfdGroup>>(documentSet.documents, /^dfd\/[^/]+\/group-[^/]+\.yaml$/)),
      ...(documentSet.documents["dfd/crud-matrix.yaml"] ? { crudMatrix: fromYaml(documentSet.documents, "dfd/crud-matrix.yaml") } : {})
    },
    annotations
  };
}

function escapePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loadNativeProject<T>(clientId: string, projectId: string) {
  const response = await fetch(`/api/project?projectId=${encodeURIComponent(projectId)}`, { headers: { "X-ERDSketch-Client-ID": clientId } });
  if (response.status === 404) return undefined;
  if (!response.ok) throw new Error(await response.text());
  return readProjectDocumentSet<T>(await response.json() as ProjectDocumentSet);
}

export async function saveNativeProject<T>(clientId: string, projectId: string, state: DurableState<T>) {
  const response = await fetch("/api/project", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-ERDSketch-Client-ID": clientId },
    body: JSON.stringify(createProjectDocumentSet(projectId, state))
  });
  if (!response.ok) throw new Error(await response.text());
}

export async function encodeProjectArchive<T>(projectId: string, state: DurableState<T>) {
  const documentSet = createProjectDocumentSet(projectId, state);
  const files = Object.fromEntries(Object.entries(documentSet.documents).map(([path, text]) => [path, strToU8(text)]));
  const bytes = zipSync(files, { level: 6, mtime: new Date("1980-01-01T00:00:00Z") });
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error("Project archive is too large");
  return bytes;
}

export async function decodeProjectArchive<T>(file: Blob) {
  if (file.size > MAX_ARCHIVE_BYTES) throw new Error("This project archive cannot be opened");
  let declaredBytes = 0;
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: (entry) => {
    if (entry.name.endsWith("/")) return false;
    assertSafePath(entry.name);
    declaredBytes += entry.originalSize;
    if (declaredBytes > MAX_ARCHIVE_BYTES) throw new Error("Expanded project archive is too large");
    return true;
  } });
  let expandedBytes = 0;
  const documents: Record<string, string> = {};
  for (const path of Object.keys(archive).sort()) {
    assertSafePath(path);
    expandedBytes += archive[path].byteLength;
    if (expandedBytes > MAX_ARCHIVE_BYTES) throw new Error("Expanded project archive is too large");
    documents[path] = strFromU8(archive[path]);
  }
  const manifest = fromYaml<ProjectManifest>(documents, "project.yaml");
  return readProjectDocumentSet<T>({ formatVersion: FORMAT_VERSION, projectId: manifest.project_id, documents });
}

export async function chooseProjectDirectory() {
  if (!window.showDirectoryPicker) return undefined;
  return window.showDirectoryPicker({ mode: "readwrite" });
}

async function directoryForPath(root: FileSystemDirectoryHandle, parts: string[], create: boolean) {
  let directory = root;
  for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
  return directory;
}

async function writeDocument(root: FileSystemDirectoryHandle, path: string, text: string) {
  const parts = path.split("/");
  const name = parts.pop()!;
  const directory = await directoryForPath(root, parts, true);
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function removeDocument(root: FileSystemDirectoryHandle, path: string) {
  const parts = path.split("/");
  const name = parts.pop()!;
  try {
    const directory = await directoryForPath(root, parts, false);
    await directory.removeEntry(name);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
  }
}

async function collectDocuments(directory: FileSystemDirectoryHandle, prefix = ""): Promise<Record<string, string>> {
  const documents: Record<string, string> = {};
  for await (const [name, handle] of directory.entries()) {
    const path = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "file") {
      if (path === "project.yaml" || (path.endsWith(".yaml") && MANAGED_ROOTS.has(path.split("/")[0]))) documents[path] = await (await handle.getFile()).text();
    } else if (MANAGED_ROOTS.has(path.split("/")[0])) Object.assign(documents, await collectDocuments(handle, path));
  }
  return documents;
}

export async function saveProjectDirectory<T>(directory: FileSystemDirectoryHandle, projectId: string, state: DurableState<T>) {
  const documentSet = createProjectDocumentSet(projectId, state);
  const previous = await collectDocuments(directory);
  for (const [path, text] of Object.entries(documentSet.documents).filter(([path]) => path !== "project.yaml")) await writeDocument(directory, path, text);
  await writeDocument(directory, "project.yaml", documentSet.documents["project.yaml"]);
  for (const path of Object.keys(previous)) if (!(path in documentSet.documents)) await removeDocument(directory, path);
}

export async function loadProjectDirectory<T>(directory: FileSystemDirectoryHandle, _projectId: string) {
  const documents = await collectDocuments(directory);
  const manifest = fromYaml<ProjectManifest>(documents, "project.yaml");
  return readProjectDocumentSet<T>({ formatVersion: FORMAT_VERSION, projectId: manifest.project_id, documents });
}
