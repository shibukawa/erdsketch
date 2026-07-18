import { AlertTriangle, FileArchive, FileCode2, FileJson2, Network, X } from "lucide-react";
import { startTransition, useCallback, useState, type ChangeEvent, type MouseEvent } from "react";
import { convertProjectToCodegenJSON, exportProjectDrawIO, exportProjectMarkdown, exportProjectSQL, type ExportDiagnostic, type SQLDialect } from "../../export/codegenWasm";
import { createArtifactZip, downloadBlob } from "../../export/zip";
import type { CardDisplayMode, CrudMatrixOrientation, ExportSettings, NameDisplayMode } from "../../features/modeling/types";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { GuidedTourTrigger } from "../guidedTour/GuidedTourTrigger";

type ExportMode = "diagram" | "document" | "json" | "sql";

type Props = {
  canonicalProjectJSON: string;
  projectName: string;
  exportSettings: ExportSettings;
  onChangeExportSettings: (settings: ExportSettings) => void;
  onClose: () => void;
};

const modes: Array<{ id: ExportMode; label: string; icon: typeof Network }> = [
  { id: "diagram", label: "Diagram", icon: Network },
  { id: "document", label: "Document", icon: FileArchive },
  { id: "json", label: "JSON", icon: FileJson2 },
  { id: "sql", label: "SQL", icon: FileCode2 }
];
const dialects: SQLDialect[] = ["mysql", "postgresql", "sqlite", "duckdb", "bigquery"];

function safeFileName(value: string) {
  return value.trim().replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "") || "erdsketch-project";
}

function presentationOptionClass(selected: boolean) {
  return `btn join-item btn-sm border-slate-300 ${selected ? "btn-neutral text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`;
}

export function ExportDialog({ canonicalProjectJSON, projectName, exportSettings, onChangeExportSettings, onClose }: Props) {
  const [mode, setMode] = useState<ExportMode>("diagram");
  const [nameMode, setNameMode] = useState<NameDisplayMode>(exportSettings.nameDisplayMode);
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>(exportSettings.cardDisplayMode);
  const [crudOrientation, setCrudOrientation] = useState<CrudMatrixOrientation>(exportSettings.crudOrientation);
  const [selectedDialect, setSelectedDialect] = useState<SQLDialect>(exportSettings.sqlDialect);
  const [diagnostics, setDiagnostics] = useState<ExportDiagnostic[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const baseName = safeFileName(projectName);

  const handleMode = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    setMode(event.currentTarget.dataset.mode as ExportMode);
    setDiagnostics([]);
    setError(undefined);
  }, []);

  const handleDialect = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const dialect = event.currentTarget.dataset.dialect as SQLDialect;
    setSelectedDialect(dialect);
    onChangeExportSettings({ nameDisplayMode: nameMode, cardDisplayMode, crudOrientation, sqlDialect: dialect });
  }, [cardDisplayMode, crudOrientation, nameMode, onChangeExportSettings]);

  const handleNameMode = useCallback((mode: NameDisplayMode) => {
    setNameMode(mode);
    onChangeExportSettings({ nameDisplayMode: mode, cardDisplayMode, crudOrientation, sqlDialect: selectedDialect });
  }, [cardDisplayMode, crudOrientation, onChangeExportSettings, selectedDialect]);

  const handleCardMode = useCallback((mode: CardDisplayMode) => {
    setCardDisplayMode(mode);
    onChangeExportSettings({ nameDisplayMode: nameMode, cardDisplayMode: mode, crudOrientation, sqlDialect: selectedDialect });
  }, [crudOrientation, nameMode, onChangeExportSettings, selectedDialect]);

  const handleCrudOrientation = useCallback((orientation: CrudMatrixOrientation) => {
    setCrudOrientation(orientation);
    onChangeExportSettings({ nameDisplayMode: nameMode, cardDisplayMode, crudOrientation: orientation, sqlDialect: selectedDialect });
  }, [cardDisplayMode, nameMode, onChangeExportSettings, selectedDialect]);

  const handleExport = useCallback(async () => {
    setBusy(true);
    setError(undefined);
    setDiagnostics([]);
    try {
      if (mode === "diagram") {
        const result = await exportProjectDrawIO(canonicalProjectJSON, {
          nameMode,
          modelCardContent: cardDisplayMode === "description" ? "description" : "primary_keys",
          crudOrientation
        });
        const artifact = result.artifacts[0];
        if (!artifact || result.artifacts.length !== 1) throw new Error("draw.io export did not return one document");
        downloadBlob(new Blob([artifact.content], { type: artifact.mediaType }), `${baseName}.drawio`);
      } else if (mode === "document") {
        const result = await exportProjectMarkdown(canonicalProjectJSON, {
          nameMode,
          modelCardContent: cardDisplayMode === "description" ? "description" : "primary_keys",
          generatedAt: new Date().toISOString(),
          sourceSnapshotRevision: "workspace-snapshot"
        });
        downloadBlob(createArtifactZip(result.artifacts), `${baseName}-documents.zip`);
      } else if (mode === "json") {
        const json = await convertProjectToCodegenJSON(canonicalProjectJSON);
        downloadBlob(new Blob([json], { type: "application/json" }), `${baseName}.codegen.json`);
      } else {
        const result = await exportProjectSQL(canonicalProjectJSON, { dialects: [selectedDialect] });
        startTransition(() => setDiagnostics(result.diagnostics));
        if (result.diagnostics.some((item) => item.severity === "error")) return;
        if (result.artifacts.length === 1) {
          downloadBlob(new Blob([result.artifacts[0].content], { type: result.artifacts[0].mediaType }), `${baseName}-${result.artifacts[0].path}`);
        } else {
          downloadBlob(createArtifactZip(result.artifacts), `${baseName}-sql.zip`);
        }
      }
    } catch (reason) {
      startTransition(() => setError(reason instanceof Error ? reason.message : String(reason)));
    } finally {
      startTransition(() => setBusy(false));
    }
  }, [baseName, canonicalProjectJSON, cardDisplayMode, crudOrientation, mode, nameMode, selectedDialect]);

  const blocked = false;
  return (
    <div data-tour="export-dialog" className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
      <GuidedTourTrigger tour="export" />
      <div className="modal-box flex h-[min(560px,calc(100dvh-2rem))] max-w-4xl flex-col overflow-hidden rounded-xl bg-white p-0 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-red-700">Project artifacts</p><h2 id="export-dialog-title" className="text-xl font-bold">Export</h2></div>
          <div className="flex items-center gap-1"><GuidedTourButton tour="export" label="Export" compact /><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close export dialog"><X size={18} /></button></div>
        </header>
        <div className="flex min-h-0 flex-1">
          <nav data-tour="export-formats" className="w-44 shrink-0 border-r border-slate-200 bg-slate-50 p-3" aria-label="Export format">
            {modes.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} type="button" data-mode={item.id} className={`btn mb-1 w-full justify-start gap-2 ${mode === item.id ? "btn-neutral" : "btn-ghost"}`} onClick={handleMode}><Icon size={16} />{item.label}</button>;
            })}
          </nav>
          <section data-tour="export-options" className="min-w-0 flex-1 overflow-y-auto p-6">
            {mode === "diagram" && <DiagramExportPanel projectName={projectName} nameMode={nameMode} cardDisplayMode={cardDisplayMode} crudOrientation={crudOrientation} onNameMode={handleNameMode} onCardDisplayMode={handleCardMode} onCrudOrientation={handleCrudOrientation} />}
            {mode === "document" && <DocumentExportPanel nameMode={nameMode} cardDisplayMode={cardDisplayMode} onNameMode={handleNameMode} onCardDisplayMode={handleCardMode} />}
            {mode === "json" && <div><h3 className="font-bold">Code-generation JSON</h3><p className="mt-1 text-sm text-slate-600">Downloads normalized JSON only. JSON Schema bundle generation is not connected yet.</p></div>}
            {mode === "sql" && <SQLExportPanel selectedDialect={selectedDialect} onChangeDialect={handleDialect} />}
            {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            {diagnostics.length > 0 && <ExportDiagnostics diagnostics={diagnostics} />}
          </section>
        </div>
        <footer data-tour="export-actions" className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-error text-white" disabled={busy || blocked} onClick={handleExport}>{busy ? "Generating…" : "Export"}</button>
        </footer>
      </div>
      <button className="modal-backdrop" onClick={onClose} aria-label="Close export dialog" />
    </div>
  );
}

type PresentationProps = {
  nameMode: NameDisplayMode;
  cardDisplayMode: CardDisplayMode;
  onNameMode: (mode: NameDisplayMode) => void;
  onCardDisplayMode: (mode: CardDisplayMode) => void;
};

function DiagramExportPanel({ projectName, crudOrientation, onCrudOrientation, ...presentation }: PresentationProps & { projectName: string; crudOrientation: CrudMatrixOrientation; onCrudOrientation: (orientation: CrudMatrixOrientation) => void }) {
  const handleModelsAsColumns = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    onCrudOrientation(event.currentTarget.checked ? "processes_rows" : "models_rows");
  }, [onCrudOrientation]);
  return <div className="space-y-5"><div><h3 className="font-bold">Editable draw.io diagrams</h3><p className="mt-1 text-sm text-slate-600">{`All ERD, DFD, and CRUD diagrams from ${projectName} are exported in one draw.io file. Each diagram opens as a separate sheet.`}</p></div><ExportPresentationControls {...presentation} /><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"><input type="checkbox" className="checkbox checkbox-sm mt-0.5" checked={crudOrientation === "processes_rows"} onChange={handleModelsAsColumns} /><span><span className="block text-sm font-bold">Models as CRUD columns</span><span className="mt-1 block text-xs text-slate-600">Turn off to place processes in columns. The current CRUD Matrix orientation is selected initially.</span></span></label><div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"><p className="font-bold">One file, multiple sheets</p><p className="mt-1">The downloaded .drawio file contains every project diagram.</p></div></div>;
}

function DocumentExportPanel(props: PresentationProps) {
  return <div className="space-y-5"><div><h3 className="font-bold">Markdown document bundle</h3><p className="mt-1 text-sm text-slate-600">Downloads Markdown inventories, ERD/DFD/CRUD SVG files, and the manifest as one ZIP.</p></div><ExportPresentationControls {...props} /></div>;
}

function SQLExportPanel({ selectedDialect, onChangeDialect }: { selectedDialect: SQLDialect; onChangeDialect: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <div className="space-y-4"><div><h3 className="font-bold">SQL DDL</h3><p className="mt-1 text-sm text-slate-600">Select one database dialect.</p></div><div className="grid gap-2 sm:grid-cols-2">{dialects.map((dialect) => <label key={dialect} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3"><input type="radio" name="sql-dialect" data-dialect={dialect} className="radio radio-sm" checked={selectedDialect === dialect} onChange={onChangeDialect} /><span className="font-mono text-sm">{dialect}</span></label>)}</div></div>;
}

function ExportDiagnostics({ diagnostics }: { diagnostics: ExportDiagnostic[] }) {
  return <div className="mt-5 space-y-2"><h3 className="flex items-center gap-2 font-bold"><AlertTriangle size={16} />Validation</h3>{diagnostics.map((item, index) => <article key={`${item.code}:${item.sourceId}:${index}`} className={`rounded-lg border p-3 text-sm ${item.severity === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}><p className="font-bold">{item.code}</p><p>{item.message}</p>{item.suggestedFix && <p className="mt-1 text-xs">{item.suggestedFix}</p>}</article>)}</div>;
}

function ExportPresentationControls({ nameMode, cardDisplayMode, onNameMode, onCardDisplayMode }: PresentationProps) {
  const handleNameMode = useCallback((event: MouseEvent<HTMLButtonElement>) => onNameMode(event.currentTarget.dataset.nameMode as NameDisplayMode), [onNameMode]);
  const handleCardMode = useCallback((event: MouseEvent<HTMLButtonElement>) => onCardDisplayMode(event.currentTarget.dataset.cardMode as CardDisplayMode), [onCardDisplayMode]);
  return <div className="grid gap-4 sm:grid-cols-2"><fieldset><legend className="mb-2 text-sm font-bold">Names</legend><div className="join" role="radiogroup" aria-label="Names">{(["business", "system", "physical"] as NameDisplayMode[]).map((item) => <button key={item} type="button" role="radio" aria-checked={nameMode === item} data-name-mode={item} className={presentationOptionClass(nameMode === item)} onClick={handleNameMode}>{item}</button>)}</div></fieldset><fieldset><legend className="mb-2 text-sm font-bold">Card content</legend><div className="join" role="radiogroup" aria-label="Card content">{(["description", "key-fields"] as CardDisplayMode[]).map((item) => <button key={item} type="button" role="radio" aria-checked={cardDisplayMode === item} data-card-mode={item} className={presentationOptionClass(cardDisplayMode === item)} onClick={handleCardMode}>{item === "key-fields" ? "Primary keys" : "Description"}</button>)}</div></fieldset></div>;
}
