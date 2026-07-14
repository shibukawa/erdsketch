import { useCallback, useMemo, type ChangeEvent } from "react";
import type { CrudOperation, DfdCrudAssignment, DfdFlow, DfdGroup, DfdNode, ModelSeed } from "../../features/modeling/types";
import { crudAssignmentSpecs, endpointBounds, expandedEndpointNodes, modelEndpointCrud, processUnits } from "../../features/dfd/dfd";

type Props = {
  flow: DfdFlow;
  nodes: DfdNode[];
  groups: DfdGroup[];
  models: ModelSeed[];
  onChange: (assignments: DfdCrudAssignment[]) => void;
};

type AxisItem = { id: string; label: string; kind: "process" | "model" };

export function DfdCrudEditor({ flow, nodes, groups, models, onChange }: Props) {
  const specs = useMemo(() => crudAssignmentSpecs(flow, nodes, groups), [flow, groups, nodes]);
  const sourceBounds = endpointBounds(flow.sourceId, nodes, groups);
  const destinationBounds = endpointBounds(flow.destinationId, nodes, groups);
  const leftId = sourceBounds && destinationBounds && sourceBounds.x + sourceBounds.width / 2 <= destinationBounds.x + destinationBounds.width / 2 ? flow.sourceId : flow.destinationId;
  const rightId = leftId === flow.sourceId ? flow.destinationId : flow.sourceId;
  const axisItems = useCallback((endpointId: string): AxisItem[] => expandedEndpointNodes(endpointId, nodes, groups).reduce<AxisItem[]>((items, node) => {
    if (node.kind === "process") items.push(...processUnits(node).map((unit) => ({ id: unit.id, label: unit.name, kind: "process" as const })));
    if (node.kind === "model" && node.modelId) items.push({ id: node.modelId, label: models.find((model) => model.id === node.modelId)?.title ?? node.name, kind: "model" });
    return items;
  }, []), [groups, models, nodes]);
  const rows = axisItems(leftId);
  const columns = axisItems(rightId);
  const assignments = useMemo(() => new Map((flow.crudAssignments ?? []).map((assignment) => [`${assignment.processUnitId}\0${assignment.modelId}`, assignment])), [flow.crudAssignments]);

  const handleToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const processUnitId = event.currentTarget.dataset.processUnitId!;
    const modelId = event.currentTarget.dataset.modelId!;
    const operation = event.currentTarget.value as CrudOperation;
    const spec = specs.find((item) => item.processUnitId === processUnitId && item.modelId === modelId);
    if (!spec) return;
    const key = `${processUnitId}\0${modelId}`;
    const current = assignments.get(key)?.operations ?? spec.defaults;
    const operations = event.currentTarget.checked ? [...current, operation] : current.filter((item) => item !== operation);
    if (operations.length === 0) return;
    const next = specs.map((item) => {
      const itemKey = `${item.processUnitId}\0${item.modelId}`;
      return itemKey === key
        ? { processUnitId, modelId, operations: item.allowed.filter((candidate) => operations.includes(candidate)) }
        : assignments.get(itemKey) ?? { processUnitId: item.processUnitId, modelId: item.modelId, operations: item.defaults };
    });
    onChange(next);
  }, [assignments, onChange, specs]);

  if (specs.length === 0) {
    const modelEndpointId = [flow.sourceId, flow.destinationId].find((id) => modelEndpointCrud(flow, id, nodes, groups).length > 0);
    if (!modelEndpointId) return null;
    return <div><p className="text-xs font-bold text-slate-600">Model operations</p><p className="mt-1 text-xs text-slate-500">{modelEndpointCrud(flow, modelEndpointId, nodes, groups).join("")} is derived from flow direction. Detailed assignments require a process/model pair.</p></div>;
  }

  return <div><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-600">Detailed CRUD</span><span className="text-[10px] text-slate-400">rows: left · columns: right</span></div><div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="table table-xs"><thead><tr><th className="sticky left-0 z-10 min-w-24 bg-slate-50">Left \ Right</th>{columns.map((column) => <th key={`${column.kind}:${column.id}`} className="min-w-24 whitespace-normal text-center leading-tight">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={`${row.kind}:${row.id}`}><th className="sticky left-0 z-10 whitespace-normal bg-white leading-tight">{row.label}</th>{columns.map((column) => {
    const processUnitId = row.kind === "process" ? row.id : column.id;
    const modelId = row.kind === "model" ? row.id : column.id;
    const spec = specs.find((item) => item.processUnitId === processUnitId && item.modelId === modelId);
    const current = spec ? assignments.get(`${processUnitId}\0${modelId}`)?.operations ?? spec.defaults : [];
    return <td key={`${row.id}:${column.id}`} className="text-center">{spec ? <div className="flex justify-center gap-1">{spec.allowed.map((operation) => <label key={operation} className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded border text-[10px] font-bold ${current.includes(operation) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-500"}`}><input type="checkbox" className="sr-only" data-process-unit-id={processUnitId} data-model-id={modelId} value={operation} checked={current.includes(operation)} onChange={handleToggle} />{operation}</label>)}</div> : <span className="text-slate-300">—</span>}</td>;
  })}</tr>)}</tbody></table></div></div>;
}
