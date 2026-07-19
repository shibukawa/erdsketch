import { ChevronLeft, ChevronRight, LocateFixed, Move, Sprout, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

type Props = {
  scale: number;
  onResetView: () => void;
  onUpdateScale: (scale: number) => void;
  dailyTip?: string;
};

export function CanvasTips({ scale, onResetView, onUpdateScale, dailyTip }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  function handleToggle() {
    setOpen((current) => !current);
  }

  function handlePrevious() {
    setPage((current) => (current + 1) % 2);
  }

  function handleNext() {
    setPage((current) => (current + 1) % 2);
  }

  const handleZoomOut = () => onUpdateScale(scale * 0.85);
  const handleZoomIn = () => onUpdateScale(scale * 1.15);

  return (
    <div className="absolute bottom-5 right-5 z-30 flex flex-col items-end gap-3" data-no-pan="true">
      {open && (
        <section className="w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl" aria-label="Today's tips">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900">Today&apos;s tips</h2>
            <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={handleToggle} aria-label="Close tips"><X size={15} /></button>
          </div>
          {dailyTip ? <p className="mt-3 text-sm leading-6 text-slate-600">{dailyTip}</p> : page === 0 ? (
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Move size={14} />Drag empty space to pan</p>
              <p className="flex items-center gap-2"><ZoomIn size={14} />Pinch or Ctrl-wheel to zoom</p>
            </div>
          ) : (
            <div className="mt-3 text-sm leading-6 text-slate-600">
              <p className="flex items-center gap-2 font-bold text-slate-800"><Sprout size={15} />Matured level</p>
              <p className="mt-1">Move from seed through concept and logical stages toward a matured model. The card drawing becomes more solid as the design settles.</p>
            </div>
          )}
          {!dailyTip && <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={handlePrevious} aria-label="Previous tip"><ChevronLeft size={16} /></button>
            <span className="text-xs font-semibold text-slate-400">{page + 1} / 2</span>
            <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={handleNext} aria-label="Next tip"><ChevronRight size={16} /></button>
          </div>}
        </section>
      )}
      <div className="flex items-center gap-2">
        <div className="join rounded-full bg-white shadow-lg" aria-label="Canvas viewport controls">
          <button type="button" className="btn join-item btn-sm btn-square" onClick={onResetView} aria-label="Reset canvas view"><LocateFixed size={16} /></button>
          <button type="button" className="btn join-item btn-sm btn-square" onClick={handleZoomOut} aria-label="Zoom out"><ZoomOut size={16} /></button>
          <span className="join-item flex h-8 min-w-14 items-center justify-center border-y border-slate-300 bg-white px-2 text-xs font-semibold tabular-nums">{Math.round(scale * 100)}%</span>
          <button type="button" className="btn join-item btn-sm btn-square" onClick={handleZoomIn} aria-label="Zoom in"><ZoomIn size={16} /></button>
        </div>
        <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-xl font-bold text-white shadow-lg transition hover:scale-105 hover:bg-slate-800" onClick={handleToggle} aria-label="Show today's tips" aria-expanded={open}>?</button>
      </div>
    </div>
  );
}
