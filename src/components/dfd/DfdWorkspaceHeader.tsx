import { ChevronDown, Grid3X3, LocateFixed, Search, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback } from "react";
import type { Collaborator } from "../../collaboration";

type DfdWorkspaceHeaderProps = {
  me: Collaborator;
  users: Collaborator[];
  connected: boolean;
  canvasName: string;
  scale: number;
  onOpenCanvasSelector: () => void;
  onOpenModelPicker: () => void;
  onOpenCrudMatrix: () => void;
  onResetView: () => void;
  onUpdateScale: (scale: number) => void;
};

export function DfdWorkspaceHeader({ me, users, connected, canvasName, scale, onOpenCanvasSelector, onOpenModelPicker, onOpenCrudMatrix, onResetView, onUpdateScale }: DfdWorkspaceHeaderProps) {
  const zoomOut = useCallback(() => onUpdateScale(scale * 0.85), [onUpdateScale, scale]);
  const zoomIn = useCallback(() => onUpdateScale(scale * 1.15), [onUpdateScale, scale]);
  return <header className="z-10 flex items-center justify-between border-b border-slate-200 bg-white px-7 py-4 shadow-sm"><button type="button" className="btn h-auto min-h-12 max-w-[360px] justify-start gap-3 rounded-xl border-slate-200 bg-slate-50 px-4 py-2 text-left shadow-sm" onClick={onOpenCanvasSelector}><span className="truncate text-xl font-bold">{canvasName}</span><ChevronDown size={18} className="text-slate-400" /></button><div className="flex items-center gap-2"><button className="btn btn-outline btn-sm gap-2" onClick={onOpenModelPicker}><Search size={15} />Models</button><button className="btn btn-outline btn-sm gap-2" onClick={onOpenCrudMatrix}><Grid3X3 size={15} />CRUD Matrix</button><div className="mr-1 flex -space-x-2">{users.filter((user) => user.id !== me.id).slice(0, 4).map((user) => <span key={user.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white" style={{ backgroundColor: user.color }} title={user.name}>{user.name.slice(0, 1).toUpperCase()}</span>)}</div><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} /><span className="btn btn-ghost btn-sm pointer-events-none"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: me.color }} />{me.name}</span><button className="btn btn-outline btn-sm gap-2" onClick={onResetView}><LocateFixed size={15} />Reset</button><div className="join"><button className="btn join-item btn-sm" aria-label="Zoom out" onClick={zoomOut}><ZoomOut size={15} /></button><span className="join-item flex h-8 min-w-16 items-center justify-center border-y border-slate-300 bg-white px-3 text-sm font-semibold">{Math.round(scale * 100)}%</span><button className="btn join-item btn-sm" aria-label="Zoom in" onClick={zoomIn}><ZoomIn size={15} /></button></div></div></header>;
}
