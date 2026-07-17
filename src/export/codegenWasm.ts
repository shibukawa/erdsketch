type TinyGoRuntime = {
  importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
};

type TinyGoConstructor = new () => TinyGoRuntime;

type ConversionResult =
  | { ok: true; json: string }
  | { ok: false; error: string };

type ExportFunction = (canonicalProjectJSON: string, optionsJSON: string) => ConversionResult;

export type ExportArtifact = {
  path: string;
  mediaType: string;
  content: string;
};

export type ExportDiagnosticTarget = {
  kind: "export" | "model" | "field" | "domain" | "relationship" | string;
  modelId: string;
  fieldId: string;
  domainId: string;
  relationshipId: string;
};

export type ExportDiagnostic = {
  severity: "error" | "warning";
  code: string;
  message: string;
  exportMode: string;
  artifactId: string;
  sourceKind: string;
  sourceId: string;
  sourcePath: string;
  canvasId: string;
  editorTarget: string;
  suggestedFix: string;
  target: ExportDiagnosticTarget;
};

export type ExportResult = {
  artifacts: ExportArtifact[];
  diagnostics: ExportDiagnostic[];
};

export type MarkdownExportOptions = {
  nameMode: "business" | "system" | "physical";
  modelCardContent: "description" | "primary_keys";
  generatedAt: string;
  sourceSnapshotRevision: string;
};

export type SQLDialect = "mysql" | "postgresql" | "sqlite" | "duckdb" | "bigquery";

export type SQLExportOptions = {
  dialects: SQLDialect[];
  modelIds?: string[];
};

type ExportWasmGlobal = typeof globalThis & {
  Go?: TinyGoConstructor;
  erdsketchConvertCodegenJSON?: (canonicalProjectJSON: string) => ConversionResult;
  erdsketchExportMarkdown?: ExportFunction;
  erdsketchExportSQL?: ExportFunction;
};

let runtimePromise: Promise<void> | undefined;

function staticAssetURL(name: string) {
  return `${import.meta.env.BASE_URL}${name}`;
}

function loadRuntimeScript() {
  const source = staticAssetURL("wasm_exec.js");
  const existing = document.querySelector<HTMLScriptElement>(`script[data-erdsketch-wasm-runtime="${source}"]`);
  if (existing) {
    if ((globalThis as ExportWasmGlobal).Go) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load TinyGo runtime")), { once: true });
    });
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = source;
    script.async = true;
    script.dataset.erdsketchWasmRuntime = source;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load TinyGo runtime")), { once: true });
    document.head.append(script);
  });
}

async function waitForConverter() {
  const scope = globalThis as ExportWasmGlobal;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (scope.erdsketchConvertCodegenJSON && scope.erdsketchExportMarkdown && scope.erdsketchExportSQL) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("TinyGo export converter did not initialize");
}

async function initializeRuntime() {
  await loadRuntimeScript();
  const scope = globalThis as ExportWasmGlobal;
  if (!scope.Go) throw new Error("TinyGo runtime is unavailable");
  const runtime = new scope.Go();
  const response = await fetch(staticAssetURL("erdsketch-export.wasm"));
  if (!response.ok) throw new Error(`Failed to load export WASM: ${response.status}`);
  const bytes = await response.arrayBuffer();
  const instantiated = await WebAssembly.instantiate(bytes, runtime.importObject);
  void runtime.run(instantiated.instance);
  await waitForConverter();
}

export async function convertProjectToCodegenJSON(canonicalProjectJSON: string) {
  runtimePromise ??= initializeRuntime();
  await runtimePromise;
  const convert = (globalThis as ExportWasmGlobal).erdsketchConvertCodegenJSON;
  if (!convert) throw new Error("TinyGo export converter is unavailable");
  const result = convert(canonicalProjectJSON);
  if (!result.ok) throw new Error(result.error);
  return result.json;
}

export async function exportProjectMarkdown(canonicalProjectJSON: string, options: MarkdownExportOptions) {
  return runExport(canonicalProjectJSON, options, "erdsketchExportMarkdown");
}

export async function exportProjectSQL(canonicalProjectJSON: string, options: SQLExportOptions) {
  return runExport(canonicalProjectJSON, options, "erdsketchExportSQL");
}

async function runExport(
  canonicalProjectJSON: string,
  options: MarkdownExportOptions | SQLExportOptions,
  functionName: "erdsketchExportMarkdown" | "erdsketchExportSQL"
): Promise<ExportResult> {
  runtimePromise ??= initializeRuntime();
  await runtimePromise;
  const convert = (globalThis as ExportWasmGlobal)[functionName];
  if (!convert) throw new Error("TinyGo export function is unavailable");
  const result = convert(canonicalProjectJSON, JSON.stringify(options));
  if (!result.ok) throw new Error(result.error);
  const parsed: unknown = JSON.parse(result.json);
  if (!isExportResult(parsed)) throw new Error("TinyGo export function returned an invalid result");
  return parsed;
}

function isExportResult(value: unknown): value is ExportResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<ExportResult>;
  return Array.isArray(result.artifacts) && Array.isArray(result.diagnostics);
}
