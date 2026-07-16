import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent } from "react";

type CommittedRangeInputProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
};

export function CommittedRangeInput({ value, min, max, step, onCommit, className, style, ariaLabel }: CommittedRangeInputProps) {
  const [draft, setDraft] = useState(value);
  const editingRef = useRef(false);

  useEffect(() => { if (!editingRef.current) setDraft(value); }, [value]);
  const handleFocus = useCallback(() => { editingRef.current = true; setDraft(value); }, [value]);
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => { editingRef.current = true; setDraft(Number(event.target.value)); }, []);
  const commit = useCallback((next: number) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    if (next !== value) onCommit(next);
  }, [onCommit, value]);
  const handleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => commit(Number(event.currentTarget.value)), [commit]);
  const handlePointerUp = useCallback((event: PointerEvent<HTMLInputElement>) => commit(Number(event.currentTarget.value)), [commit]);
  const handlePointerCancel = useCallback(() => { editingRef.current = false; setDraft(value); }, [value]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape") return;
    editingRef.current = false;
    setDraft(value);
    event.currentTarget.blur();
  }, [value]);

  return <input type="range" className={className} min={min} max={max} step={step} value={draft} style={style} aria-label={ariaLabel} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onPointerUp={handlePointerUp} onPointerCancel={handlePointerCancel} onKeyDown={handleKeyDown} />;
}
