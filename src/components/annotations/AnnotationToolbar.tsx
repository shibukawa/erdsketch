import { ArrowDown, ArrowUp, ArrowUpRight, Check, Eye, EyeOff, MousePointer2, Pencil, Redo2, Scan, StickyNote, Trash2, Copy, Undo2 } from "lucide-react";
import { useCallback, type ReactNode } from "react";
import type { CanvasAnnotationController } from "../../features/annotations/useCanvasAnnotations";
import type { AnnotationTool } from "../../features/annotations/types";

type AnnotationToolbarProps = { controller: CanvasAnnotationController };

function ToolButton({ active, disabled, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" disabled={disabled} className={`flex h-9 w-9 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-35 ${active ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`} aria-label={label} title={label} onClick={onClick}>{children}</button>;
}

function ColorButton({ color, fill, onChange }: { color: string; fill: string; onChange: (color: string, fill: string) => void }) {
  const handleClick = useCallback(() => onChange(color, fill), [color, fill, onChange]);
  return <button type="button" className="h-5 w-5 rounded-full border border-slate-300 shadow-sm" style={{ background: fill }} aria-label={`Use ${fill}`} onClick={handleClick} />;
}

export function AnnotationToolbar({ controller }: AnnotationToolbarProps) {
  const choose = useCallback((tool: AnnotationTool) => controller.selectTool(tool), [controller]);
  const chooseSelect = useCallback(() => choose("select"), [choose]);
  const chooseSticky = useCallback(() => choose("sticky_note"), [choose]);
  const chooseArrow = useCallback(() => choose("arrow"), [choose]);
  const choosePen = useCallback(() => choose("pen"), [choose]);
  const chooseBoundary = useCallback(() => choose("boundary"), [choose]);
  const toggleVisibility = useCallback(() => controller.setVisible((current) => !current), [controller]);
  const finishPen = useCallback(() => controller.finishPenAnnotation(), [controller]);
  const beginGeometryEdit = useCallback(() => controller.beginGeometryEdit(), [controller]);
  const confirmGeometryEdit = useCallback(() => controller.confirmGeometryEdit(), [controller]);
  const deleteGeometryPart = useCallback(() => controller.deleteGeometryPart(), [controller]);

  return <div data-annotation-control="true" className="absolute left-4 top-4 z-[80] flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur" role="toolbar" aria-label="Canvas annotations">
    <ToolButton active={controller.activeTool === "select"} label="Select annotation" onClick={chooseSelect}><MousePointer2 size={18} /></ToolButton>
    <ToolButton active={controller.activeTool === "sticky_note"} label="Place sticky note" onClick={chooseSticky}><StickyNote size={18} /></ToolButton>
    <ToolButton active={controller.activeTool === "arrow"} label="Draw annotation arrow" onClick={chooseArrow}><ArrowUpRight size={18} /></ToolButton>
    <ToolButton active={controller.activeTool === "pen"} label="Draw with pen" onClick={choosePen}><Pencil size={18} /></ToolButton>
    <ToolButton active={controller.activeTool === "boundary"} label="Draw subsystem boundary" onClick={chooseBoundary}><Scan size={18} /></ToolButton>
    <span className="mx-1 h-6 w-px bg-slate-200" />
    <ToolButton label={controller.visible ? "Hide annotations" : "Show annotations"} onClick={toggleVisibility}>{controller.visible ? <Eye size={18} /> : <EyeOff size={18} />}</ToolButton>
    <ToolButton label="Undo annotation change" onClick={controller.undo}><Undo2 size={18} /></ToolButton>
    <ToolButton label="Redo annotation change" onClick={controller.redo}><Redo2 size={18} /></ToolButton>
    {controller.hasPenDraft && <>
      <span className="mx-1 h-6 w-px bg-slate-200" />
      <button type="button" className="h-9 rounded-lg bg-red-600 px-4 text-sm font-bold text-white shadow transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600" onClick={finishPen}>Done</button>
    </>}
    {controller.selected && !controller.geometryEditing && <>
      <span className="mx-1 h-6 w-px bg-slate-200" />
      <ToolButton label="Duplicate annotation" onClick={controller.duplicateSelected}><Copy size={18} /></ToolButton>
      <ToolButton label="Move annotation backward" onClick={controller.moveSelectedBackward}><ArrowDown size={18} /></ToolButton>
      <ToolButton label="Move annotation forward" onClick={controller.moveSelectedForward}><ArrowUp size={18} /></ToolButton>
      {(controller.selected.kind === "freehand_stroke" || controller.selected.kind === "background_boundary") && <ToolButton label="Edit annotation geometry" onClick={beginGeometryEdit}><Pencil size={18} /></ToolButton>}
      {controller.canConvertSelectedToBoundary && <ToolButton label="Use closed stroke as background boundary" onClick={controller.convertSelectedToBoundary}><Scan size={18} /></ToolButton>}
      <ToolButton label="Delete annotation" onClick={controller.deleteSelected}><Trash2 size={18} /></ToolButton>
      <div className="flex items-center gap-1 px-1" aria-label="Annotation color">
        {controller.palette.map((color) => <ColorButton key={color.fill} color={color.color} fill={color.fill} onChange={controller.changeSelectedColor} />)}
      </div>
    </>}
    {controller.selected && controller.geometryEditing && <>
      <span className="mx-1 h-6 w-px bg-slate-200" />
      <ToolButton disabled={!controller.canDeleteGeometryPart} label={controller.selected.kind === "freehand_stroke" ? "Delete selected stroke" : "Delete selected boundary vertex"} onClick={deleteGeometryPart}><Trash2 size={18} /></ToolButton>
      <button type="button" className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white shadow transition hover:bg-blue-700" onClick={confirmGeometryEdit}><Check size={16} />Confirm</button>
    </>}
  </div>;
}
