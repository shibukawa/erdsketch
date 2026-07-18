import { Download, GripVertical, Repeat2, TriangleAlert, X } from "lucide-react";
import { useCallback, useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import type { CrudMatrixOrientation, CrudOperation, DataDomain, DfdCrudMatrix, DfdState, ModelSeed } from "../../features/modeling/types";
import { crudAssignmentSpecs, normalizeFlowCrud, processUnits } from "../../features/dfd/dfd";
import { calculateCrudHeatmap, crudHeatmapColor, type CrudHeatmapBasis, type CrudHeatmapMetric } from "../../features/dfd/crudHeatmap";
import { formatBytes } from "../../features/modeling/capacity";
import { GuidedTourButton } from "../guidedTour/GuidedTourButton";
import { GuidedTourTrigger } from "../guidedTour/GuidedTourTrigger";

type Props = {
  dfd: DfdState;
  models: ModelSeed[];
  domains: DataDomain[];
  onChange: (dfd: DfdState) => void;
  onClose: () => void;
};

type Axis = "process" | "model";
type MatrixItem = { id: string; label: string };
type Cell = { allowed: Set<CrudOperation>; operations: Set<CrudOperation> };

const crudOrder: CrudOperation[] = ["C", "R", "U", "D"];

function orderedItems(items: MatrixItem[], order: string[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...order.map((id) => byId.get(id)).filter((item): item is MatrixItem => Boolean(item)), ...items.filter((item) => !order.includes(item.id))];
}

function csvCell(value: string) {
  return `"${value.split('"').join('""')}"`;
}

function recordCountText(metric: CrudHeatmapMetric | undefined) {
  return metric?.available && metric.value !== null ? Math.round(metric.value).toLocaleString() : "—";
}

function tableSizeText(metric: CrudHeatmapMetric | undefined) {
  return metric?.available && metric.value !== null ? formatBytes(metric.value) : "—";
}

function modelEstimateTooltip(recordMetric: CrudHeatmapMetric | undefined, storageMetric: CrudHeatmapMetric | undefined) {
  return `Record count: ${recordCountText(recordMetric)} · Table size: ${tableSizeText(storageMetric)}`;
}

export function CrudMatrixDialog({ dfd, models, domains, onChange, onClose }: Props) {
  const [dragging, setDragging] = useState<{ axis: Axis; id: string } | null>(null);
  const [heatmapBasis, setHeatmapBasis] = useState<CrudHeatmapBasis>("record_count");
  const processItems = useMemo(() => {
    const result = new Map<string, MatrixItem>();
    for (const node of dfd.nodes) if (node.kind === "process") for (const unit of processUnits(node)) if (!result.has(unit.id)) result.set(unit.id, { id: unit.id, label: unit.name });
    return [...result.values()];
  }, [dfd.nodes]);
  const modelItems = useMemo(() => models.map((model) => ({ id: model.id, label: model.title })), [models]);
  const matrix: DfdCrudMatrix = dfd.crudMatrix ?? { orientation: "processes_rows", processOrder: [], modelOrder: [] };
  const processes = orderedItems(processItems, matrix.processOrder);
  const matrixModels = orderedItems(modelItems, matrix.modelOrder);
  const cells = useMemo(() => {
    const result = new Map<string, Cell>();
    for (const flow of dfd.flows) {
      const assignments = new Map((flow.crudAssignments ?? []).map((assignment) => [`${assignment.processUnitId}\0${assignment.modelId}`, assignment]));
      for (const spec of crudAssignmentSpecs(flow, dfd.nodes, dfd.groups)) {
        const key = `${spec.processUnitId}\0${spec.modelId}`;
        const cell = result.get(key) ?? { allowed: new Set<CrudOperation>(), operations: new Set<CrudOperation>() };
        spec.allowed.forEach((operation) => cell.allowed.add(operation));
        (assignments.get(key)?.operations ?? spec.defaults).forEach((operation) => cell.operations.add(operation));
        result.set(key, cell);
      }
    }
    return result;
  }, [dfd.flows, dfd.groups, dfd.nodes]);
  const readModelIdsByProcess = useMemo(() => {
    const result = new Map<string, Set<string>>();
    for (const process of processItems) {
      const readModels = new Set<string>();
      for (const model of modelItems) if (cells.get(`${process.id}\0${model.id}`)?.operations.has("R")) readModels.add(model.id);
      result.set(process.id, readModels);
    }
    return result;
  }, [cells, modelItems, processItems]);
  const heatmaps = useMemo(() => {
    const processIds = processItems.map((process) => process.id);
    return {
      record_count: calculateCrudHeatmap(models, domains, processIds, readModelIdsByProcess, "record_count"),
      storage_size: calculateCrudHeatmap(models, domains, processIds, readModelIdsByProcess, "storage_size")
    };
  }, [domains, models, processItems, readModelIdsByProcess]);
  const heatmap = heatmaps[heatmapBasis];

  const updateMatrix = useCallback((patch: Partial<DfdCrudMatrix>) => {
    onChange({ ...dfd, crudMatrix: { ...matrix, ...patch } });
  }, [dfd, matrix, onChange]);
  const handleSwap = useCallback(() => updateMatrix({ orientation: matrix.orientation === "processes_rows" ? "models_rows" : "processes_rows" }), [matrix.orientation, updateMatrix]);
  const handleDragStart = useCallback((event: DragEvent<HTMLElement>) => {
    const item = { axis: event.currentTarget.dataset.axis as Axis, id: event.currentTarget.dataset.itemId! };
    setDragging(item);
    event.dataTransfer.setData("application/x-erdsketch-crud-axis", item.axis);
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
  }, []);
  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => event.preventDefault(), []);
  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const axis = event.currentTarget.dataset.axis as Axis;
    const targetId = event.currentTarget.dataset.itemId!;
    const source = dragging ?? {
      axis: event.dataTransfer.getData("application/x-erdsketch-crud-axis") as Axis,
      id: event.dataTransfer.getData("text/plain")
    };
    if (!source.id || source.axis !== axis || source.id === targetId) return;
    const items = axis === "process" ? processes : matrixModels;
    const ids = items.map((item) => item.id).filter((id) => id !== source.id);
    ids.splice(ids.indexOf(targetId), 0, source.id);
    updateMatrix(axis === "process" ? { processOrder: ids } : { modelOrder: ids });
    setDragging(null);
  }, [dragging, matrixModels, processes, updateMatrix]);
  const handleDragEnd = useCallback(() => setDragging(null), []);
  const handleHeatmapBasisChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => setHeatmapBasis(event.target.value as CrudHeatmapBasis), []);
  const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const processUnitId = event.currentTarget.dataset.processUnitId!;
    const modelId = event.currentTarget.dataset.modelId!;
    const operation = event.currentTarget.value as CrudOperation;
    const checked = event.currentTarget.checked;
    const flows = dfd.flows.map((flow) => {
      const specs = crudAssignmentSpecs(flow, dfd.nodes, dfd.groups);
      const target = specs.find((spec) => spec.processUnitId === processUnitId && spec.modelId === modelId && spec.allowed.includes(operation));
      if (!target) return flow;
      const assignments = specs.map((spec) => {
        const current = flow.crudAssignments?.find((assignment) => assignment.processUnitId === spec.processUnitId && assignment.modelId === spec.modelId)?.operations ?? spec.defaults;
        if (spec.processUnitId !== processUnitId || spec.modelId !== modelId) return { processUnitId: spec.processUnitId, modelId: spec.modelId, operations: current };
        const operations = checked ? [...new Set([...current, operation])] : current.filter((candidate) => candidate !== operation);
        return { processUnitId, modelId, operations: operations.length ? operations : current };
      });
      return normalizeFlowCrud({ ...flow, crudAssignments: assignments }, dfd.nodes, dfd.groups);
    });
    onChange({ ...dfd, flows });
  }, [dfd, onChange]);
  const handleExport = useCallback(() => {
    const orientation: CrudMatrixOrientation = matrix.orientation;
    const rows = orientation === "processes_rows" ? processes : matrixModels;
    const columns = orientation === "processes_rows" ? matrixModels : processes;
    const lines = [[orientation === "processes_rows" ? "Process / Model" : "Model / Process", ...columns.map((item) => item.label)].map(csvCell).join(",")];
    for (const row of rows) lines.push([row.label, ...columns.map((column) => {
      const processId = orientation === "processes_rows" ? row.id : column.id;
      const modelId = orientation === "processes_rows" ? column.id : row.id;
      const operations = cells.get(`${processId}\0${modelId}`)?.operations;
      return crudOrder.filter((operation) => operations?.has(operation)).join("");
    })].map(csvCell).join(","));
    const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "crud-matrix.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [cells, matrix.orientation, matrixModels, processes]);

  const rows = matrix.orientation === "processes_rows" ? processes : matrixModels;
  const columns = matrix.orientation === "processes_rows" ? matrixModels : processes;
  const rowAxis: Axis = matrix.orientation === "processes_rows" ? "process" : "model";
  const columnAxis: Axis = matrix.orientation === "processes_rows" ? "model" : "process";

  return <div data-tour="crud-dialog" className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="crud-matrix-title">
    <GuidedTourTrigger tour="crud" />
    <div className="modal-box flex h-[min(92vh,980px)] max-w-[min(96vw,1400px)] flex-col rounded-xl bg-white p-0">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Database design specification</p><h2 id="crud-matrix-title" className="text-xl font-bold">CRUD Matrix</h2><p className="text-xs text-slate-500">All project processes and models. Drag headers to reorder.</p></div>
        <div className="flex items-center gap-2"><button type="button" className="btn btn-outline btn-sm gap-2" onClick={handleSwap}><Repeat2 size={15} />Swap axes</button><button type="button" className="btn btn-primary btn-sm gap-2" onClick={handleExport}><Download size={15} />CSV report</button><GuidedTourButton tour="crud" label="CRUD Matrix" compact /><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={onClose} aria-label="Close CRUD Matrix"><X size={18} /></button></div>
      </header>
      <section className="shrink-0 space-y-3 border-b border-slate-200 bg-slate-50 px-5 py-3" aria-label="CRUD heatmap controls">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">Heatmap basis
            <select className="select select-bordered select-sm bg-white" value={heatmapBasis} onChange={handleHeatmapBasisChange} aria-label="Heatmap calculation basis">
              <option value="record_count">Record count</option>
              <option value="storage_size">Storage size</option>
            </select>
          </label>
          <span className="flex items-center gap-2 text-xs text-slate-600"><span className="h-4 w-12 rounded border border-slate-300 bg-gradient-to-r from-white to-[#ff9999]" />Model volume</span>
          <span className="flex items-center gap-2 text-xs text-slate-600"><span className="h-4 w-12 rounded border border-slate-300 bg-gradient-to-r from-white to-[#9999ff]" />Process read load</span>
        </div>
        <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950" role="note"><TriangleAlert className="mt-0.5 shrink-0" size={15} /><span>Heatmap values are only rough indications of SELECT query cost. Actual cost can differ substantially depending on index access, WHERE-clause selectivity, and multi-table join order or loop strategy.</span></p>
      </section>
      <div data-tour="crud-matrix" className="min-h-0 flex-1 overflow-auto overscroll-contain p-5">
        <table className="table table-sm !w-max border-separate border-spacing-0">
          <thead><tr><th className="sticky left-0 top-0 z-30 w-52 min-w-52 max-w-52 border border-slate-200 bg-slate-100">{matrix.orientation === "processes_rows" ? "Process / Model" : "Model / Process"}</th>{columns.map((column) => {
            const metric = columnAxis === "model" ? heatmap.models.get(column.id) : heatmap.processes.get(column.id);
            const backgroundColor = columnAxis === "model" ? crudHeatmapColor(metric?.weight ?? 0, 0) : crudHeatmapColor(0, metric?.weight ?? 0);
            const title = columnAxis === "model" ? modelEstimateTooltip(heatmaps.record_count.models.get(column.id), heatmaps.storage_size.models.get(column.id)) : column.label;
            return <th key={column.id} draggable data-axis={columnAxis} data-item-id={column.id} className="sticky top-0 z-20 h-44 w-20 min-w-20 max-w-20 cursor-grab border border-slate-200 p-0 text-center active:cursor-grabbing" style={{ backgroundColor }} title={title} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}><span className="relative block h-44 w-full"><span className="absolute left-1/2 top-1/2 flex w-40 -translate-x-1/2 -translate-y-1/2 -rotate-90 items-center justify-start gap-1 overflow-hidden whitespace-nowrap text-left"><GripVertical size={13} className="shrink-0 text-slate-500" /><span className="truncate">{column.label}</span></span></span></th>;
          })}</tr></thead>
          <tbody>{rows.map((row) => {
            const rowMetric = rowAxis === "model" ? heatmap.models.get(row.id) : heatmap.processes.get(row.id);
            const rowBackground = rowAxis === "model" ? crudHeatmapColor(rowMetric?.weight ?? 0, 0) : crudHeatmapColor(0, rowMetric?.weight ?? 0);
            const rowTitle = rowAxis === "model" ? modelEstimateTooltip(heatmaps.record_count.models.get(row.id), heatmaps.storage_size.models.get(row.id)) : row.label;
            return <tr key={row.id}><th draggable data-axis={rowAxis} data-item-id={row.id} className="sticky left-0 z-10 w-52 min-w-52 max-w-52 cursor-grab border border-slate-200 active:cursor-grabbing" style={{ backgroundColor: rowBackground }} title={rowTitle} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}><span className="flex items-center gap-1"><GripVertical size={13} className="shrink-0 text-slate-500" /><span className="min-w-0 flex-1 truncate">{row.label}</span></span></th>{columns.map((column) => {
              const processUnitId = matrix.orientation === "processes_rows" ? row.id : column.id;
              const modelId = matrix.orientation === "processes_rows" ? column.id : row.id;
              const cell = cells.get(`${processUnitId}\0${modelId}`);
              const modelMetric = heatmap.models.get(modelId);
              const processMetric = heatmap.processes.get(processUnitId);
              const backgroundColor = crudHeatmapColor(modelMetric?.weight ?? 0, processMetric?.weight ?? 0);
              const title = modelEstimateTooltip(heatmaps.record_count.models.get(modelId), heatmaps.storage_size.models.get(modelId));
              return <td key={`${row.id}:${column.id}`} className="border border-slate-100 px-1 text-center" style={{ backgroundColor }} title={title}>{cell ? <div className="flex justify-center gap-0.5">{crudOrder.filter((operation) => cell.allowed.has(operation)).map((operation) => <label key={operation} className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded border text-[10px] font-bold ${cell.operations.has(operation) ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white/70 text-slate-600"}`}><input className="sr-only" type="checkbox" data-process-unit-id={processUnitId} data-model-id={modelId} value={operation} checked={cell.operations.has(operation)} onChange={handleToggle} />{operation}</label>)}</div> : <span className="text-slate-500">—</span>}</td>;
            })}</tr>;
          })}</tbody>
        </table>
        {rows.length === 0 || columns.length === 0 ? <p className="mt-8 text-center text-sm text-slate-500">Create at least one process and one model to populate the matrix.</p> : null}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-xs text-slate-500"><span>Cells are derived from detailed DFD flow assignments.</span><span>C create · R read · U update · D delete</span></footer>
    </div>
    <button className="modal-backdrop" onClick={onClose} aria-label="Close CRUD Matrix" />
  </div>;
}
