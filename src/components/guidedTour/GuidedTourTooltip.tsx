import { X } from "lucide-react";
import { useCallback, type MouseEvent } from "react";
import type { TooltipRenderProps } from "react-joyride";
import { useGuidedTour } from "./GuidedTourContext";

export function GuidedTourTooltip({ backProps, closeProps, controls, index, primaryProps, size, skipProps, step, tooltipProps }: TooltipRenderProps) {
  const { closeTemporarily } = useGuidedTour();
  const handleClose = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    controls.stop();
    closeTemporarily();
  }, [closeTemporarily, controls]);

  return <div {...tooltipProps} aria-labelledby="guided-tour-title" data-i18n-skip className="w-[min(92vw,390px)] rounded-2xl bg-white p-5 text-slate-950 shadow-2xl">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{index + 1} / {size}</p>{step.title && <h4 id="guided-tour-title" className="mt-1 text-lg font-bold">{step.title}</h4>}</div>
      <button {...closeProps} type="button" className="btn btn-ghost btn-sm btn-square -mr-2 -mt-2 shrink-0" onClick={handleClose}><X size={18} /></button>
    </div>
    <div className="mt-3 text-sm leading-6 text-slate-700">{step.content}</div>
    <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
      <button {...skipProps} type="button" className="btn btn-ghost btn-sm mr-auto text-slate-500">{skipProps.title}</button>
      {index > 0 && <button {...backProps} type="button" className="btn btn-ghost btn-sm">{backProps.title}</button>}
      <button {...primaryProps} type="button" className="btn btn-primary btn-sm">{primaryProps.title}</button>
    </div>
  </div>;
}
