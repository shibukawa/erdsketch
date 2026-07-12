import { ChevronLeft, ChevronRight, Move, Plus, Sprout, X, ZoomIn } from "lucide-react";
import { useCallback, useState } from "react";

export function CanvasTips() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);

  const handleToggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  const handlePrevious = useCallback(() => {
    setPage((current) => (current + 1) % 2);
  }, []);

  const handleNext = useCallback(() => {
    setPage((current) => (current + 1) % 2);
  }, []);

  return (
    <div className="absolute bottom-5 right-5 z-30 flex flex-col items-end gap-3" data-no-pan="true">
      {open && (
        <section className="w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl" aria-label="Today's tips">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900">Today&apos;s tips</h2>
            <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={handleToggle} aria-label="Close tips"><X size={15} /></button>
          </div>
          {page === 0 ? (
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Move size={14} />Drag empty space to pan</p>
              <p className="flex items-center gap-2"><ZoomIn size={14} />Pinch or Ctrl-wheel to zoom</p>
              <p className="flex items-center gap-2"><Plus size={14} />Double click canvas to add</p>
            </div>
          ) : (
            <div className="mt-3 text-sm leading-6 text-slate-600">
              <p className="flex items-center gap-2 font-bold text-slate-800"><Sprout size={15} />Matured level</p>
              <p className="mt-1">Move from seed through concept and logical stages toward a matured model. The card drawing becomes more solid as the design settles.</p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={handlePrevious} aria-label="Previous tip"><ChevronLeft size={16} /></button>
            <span className="text-xs font-semibold text-slate-400">{page + 1} / 2</span>
            <button type="button" className="btn btn-ghost btn-xs btn-square" onClick={handleNext} aria-label="Next tip"><ChevronRight size={16} /></button>
          </div>
        </section>
      )}
      <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-xl font-bold text-white shadow-lg transition hover:scale-105 hover:bg-slate-800" onClick={handleToggle} aria-label="Show today's tips" aria-expanded={open}>?</button>
    </div>
  );
}
