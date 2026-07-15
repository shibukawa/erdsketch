import type { DurableState } from "../collaboration/types";

const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const PROJECT_DOCUMENT = "project.json";

export type ProjectDocumentSet = {
  formatVersion: 1;
  projectId: string;
  documents: Record<string, string>;
};

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
  }
}

export function createProjectDocumentSet<T>(projectId: string, state: DurableState<T>): ProjectDocumentSet {
  return { formatVersion: 1, projectId, documents: { [PROJECT_DOCUMENT]: JSON.stringify(state, null, 2) + "\n" } };
}

export function readProjectDocumentSet<T>(documents: ProjectDocumentSet): DurableState<T> {
  if (documents.formatVersion !== 1 || !documents.projectId || typeof documents.documents?.[PROJECT_DOCUMENT] !== "string") throw new Error("Invalid ERDSketch project");
  return JSON.parse(documents.documents[PROJECT_DOCUMENT]) as DurableState<T>;
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

function encodeTxtar(documents: ProjectDocumentSet) {
  const files: Record<string, string> = {
    "manifest.json": JSON.stringify({ formatVersion: documents.formatVersion, projectId: documents.projectId, documents: Object.keys(documents.documents) }, null, 2) + "\n",
    ...documents.documents
  };
  return Object.entries(files).map(([name, text]) => `-- ${name} --\n${text.endsWith("\n") ? text : `${text}\n`}`).join("");
}

function decodeTxtar(text: string): ProjectDocumentSet {
  const marker = /^-- ([^\r\n]+) --\r?\n/gm;
  const matches = [...text.matchAll(marker)];
  const files: Record<string, string> = {};
  for (let index = 0; index < matches.length; index += 1) {
    const name = matches[index][1];
    if (name.startsWith("/") || name.split("/").some((part) => part === ".." || part === "." || !part)) throw new Error("Unsafe archive path");
    const start = (matches[index].index ?? 0) + matches[index][0].length;
    const end = matches[index + 1]?.index ?? text.length;
    files[name] = text.slice(start, end);
  }
  const manifestText = files["manifest.json"];
  if (!manifestText) throw new Error("Archive manifest is missing");
  const manifest = JSON.parse(manifestText) as { formatVersion: number; projectId: string; documents: string[] };
  if (manifest.formatVersion !== 1 || !manifest.projectId || !Array.isArray(manifest.documents)) throw new Error("Archive manifest is invalid");
  const documents = Object.fromEntries(manifest.documents.map((name) => {
    if (!(name in files)) throw new Error(`Archive document is missing: ${name}`);
    return [name, files[name]];
  }));
  return { formatVersion: 1, projectId: manifest.projectId, documents };
}

async function streamToBytes(stream: ReadableStream<Uint8Array>) {
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  if (bytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error("Project archive is too large");
  return bytes;
}

export async function encodeProjectArchive<T>(projectId: string, state: DurableState<T>) {
  if (!("CompressionStream" in globalThis)) throw new Error("CompressionStream is unavailable");
  const source = new Blob([encodeTxtar(createProjectDocumentSet(projectId, state))]).stream();
  return streamToBytes(source.pipeThrough(new CompressionStream("gzip")));
}

export async function decodeProjectArchive<T>(file: Blob) {
  if (file.size > MAX_ARCHIVE_BYTES || !("DecompressionStream" in globalThis)) throw new Error("This project archive cannot be opened");
  const decompressed = file.stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(decompressed).text();
  if (text.length > MAX_ARCHIVE_BYTES) throw new Error("Expanded project archive is too large");
  return readProjectDocumentSet<T>(decodeTxtar(text));
}

export async function downloadProjectArchive<T>(projectId: string, state: DurableState<T>) {
  const bytes = await encodeProjectArchive(projectId, state);
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/gzip" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${projectId}.erdsketch.txtar.gz`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function chooseProjectDirectory() {
  if (!window.showDirectoryPicker) return undefined;
  return window.showDirectoryPicker({ mode: "readwrite" });
}

export async function saveProjectDirectory<T>(directory: FileSystemDirectoryHandle, projectId: string, state: DurableState<T>) {
  const handle = await directory.getFileHandle(`${projectId}.erdsketch.json`, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(createProjectDocumentSet(projectId, state), null, 2) + "\n");
  await writable.close();
}

export async function loadProjectDirectory<T>(directory: FileSystemDirectoryHandle, projectId: string) {
  const handle = await directory.getFileHandle(`${projectId}.erdsketch.json`);
  return readProjectDocumentSet<T>(JSON.parse(await (await handle.getFile()).text()) as ProjectDocumentSet);
}
