import { AlignLeft, Braces, Database, KeyRound, Languages } from "lucide-react";
import type { MouseEvent } from "react";
import type { CardDisplayMode, NameDisplayMode } from "../../features/modeling/types";

type CanvasDisplayControlsProps = {
  displayMode: CardDisplayMode;
  nameDisplayMode?: NameDisplayMode;
  contentLabel?: string;
  onDisplayModeChange: (mode: CardDisplayMode) => void;
  onNameDisplayModeChange?: (mode: NameDisplayMode) => void;
};

export function CanvasDisplayControls({
  displayMode,
  nameDisplayMode,
  contentLabel = "Model content",
  onDisplayModeChange,
  onNameDisplayModeChange
}: CanvasDisplayControlsProps) {
  function handleDisplayMode(event: MouseEvent<HTMLButtonElement>) {
    onDisplayModeChange(event.currentTarget.dataset.mode as CardDisplayMode);
    event.currentTarget.blur();
  }

  function handleNameDisplayMode(event: MouseEvent<HTMLButtonElement>) {
    onNameDisplayModeChange?.(event.currentTarget.dataset.mode as NameDisplayMode);
    event.currentTarget.blur();
  }

  return (
    <div className="absolute bottom-5 left-24 z-30 flex items-end gap-2.5" data-no-pan="true">
      <div className="fab !static !z-auto !w-12" aria-label={contentLabel}>
        <div tabIndex={0} role="button" className="tooltip tooltip-top btn btn-lg btn-circle btn-primary shadow-lg" data-tip={contentLabel} aria-label={contentLabel}>
          {displayMode === "description" ? <AlignLeft size={21} /> : <KeyRound size={21} />}
        </div>
        <div>
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-md">Description</span>
          <button type="button" data-mode="description" className={`btn btn-circle shadow-md ${displayMode === "description" ? "btn-primary" : "bg-white"}`} aria-label="Show model descriptions" aria-pressed={displayMode === "description"} onClick={handleDisplayMode}>
            <AlignLeft size={18} />
          </button>
        </div>
        <div>
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-md">Key fields</span>
          <button type="button" data-mode="key-fields" className={`btn btn-circle shadow-md ${displayMode === "key-fields" ? "btn-primary" : "bg-white"}`} aria-label="Show model key fields" aria-pressed={displayMode === "key-fields"} onClick={handleDisplayMode}>
            <KeyRound size={18} />
          </button>
        </div>
      </div>

      {nameDisplayMode && onNameDisplayModeChange && <div className="fab !static !z-auto !w-12" aria-label="Identifier display">
        <div tabIndex={0} role="button" className="tooltip tooltip-top btn btn-lg btn-circle btn-primary shadow-lg" data-tip="Identifier display" aria-label="Identifier display">
          {nameDisplayMode === "business" ? <Languages size={21} /> : nameDisplayMode === "system" ? <Braces size={21} /> : <Database size={21} />}
        </div>
        <div>
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-md">Business</span>
          <button type="button" data-mode="business" className={`btn btn-circle shadow-md ${nameDisplayMode === "business" ? "btn-primary" : "bg-white"}`} aria-label="Show business names" aria-pressed={nameDisplayMode === "business"} onClick={handleNameDisplayMode}>
            <Languages size={18} />
          </button>
        </div>
        <div>
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-md">System</span>
          <button type="button" data-mode="system" className={`btn btn-circle shadow-md ${nameDisplayMode === "system" ? "btn-primary" : "bg-white"}`} aria-label="Show system names" aria-pressed={nameDisplayMode === "system"} onClick={handleNameDisplayMode}>
            <Braces size={18} />
          </button>
        </div>
        <div>
          <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-md">Physical</span>
          <button type="button" data-mode="physical" className={`btn btn-circle shadow-md ${nameDisplayMode === "physical" ? "btn-primary" : "bg-white"}`} aria-label="Show physical names" aria-pressed={nameDisplayMode === "physical"} onClick={handleNameDisplayMode}>
            <Database size={18} />
          </button>
        </div>
      </div>}
    </div>
  );
}
