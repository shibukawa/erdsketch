import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type InputHTMLAttributes, type KeyboardEvent } from "react";

type CommittedTextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "onBlur" | "onKeyDown"> & {
  value: string;
  onCommit: (value: string) => void;
  onEditingEnd?: () => void;
};

export function CommittedTextInput({ value, onCommit, onEditingEnd, ...inputProps }: CommittedTextInputProps) {
  const [draft, setDraft] = useState(value);
  const editingRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => { if (!editingRef.current) setDraft(value); }, [value]);
  const handleFocus = useCallback(() => { editingRef.current = true; cancelRef.current = false; setDraft(value); }, [value]);
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value), []);
  const handleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => {
    editingRef.current = false;
    if (cancelRef.current) {
      cancelRef.current = false;
      setDraft(value);
      onEditingEnd?.();
      return;
    }
    if (event.currentTarget.value !== value) onCommit(event.currentTarget.value);
    onEditingEnd?.();
  }, [onCommit, onEditingEnd, value]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.nativeEvent.isComposing || event.keyCode === 229) && event.key === "Enter") return;
    if (event.key === "Escape") {
      cancelRef.current = true;
      setDraft(value);
    }
    if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur();
  }, [value]);

  return <input {...inputProps} value={draft} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} />;
}
