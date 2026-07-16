import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type TextareaHTMLAttributes } from "react";

type CommittedTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange" | "onBlur" | "onKeyDown"> & {
  value: string;
  onCommit: (value: string) => void;
};

export function CommittedTextarea({ value, onCommit, ...textareaProps }: CommittedTextareaProps) {
  const [draft, setDraft] = useState(value);
  const editingRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => { if (!editingRef.current) setDraft(value); }, [value]);
  const handleFocus = useCallback(() => { editingRef.current = true; cancelRef.current = false; setDraft(value); }, [value]);
  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value), []);
  const handleBlur = useCallback((event: FocusEvent<HTMLTextAreaElement>) => {
    editingRef.current = false;
    if (cancelRef.current) {
      cancelRef.current = false;
      setDraft(value);
      return;
    }
    if (event.currentTarget.value !== value) onCommit(event.currentTarget.value);
  }, [onCommit, value]);
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Escape") return;
    cancelRef.current = true;
    setDraft(value);
    event.currentTarget.blur();
  }, [value]);

  return <textarea {...textareaProps} value={draft} onFocus={handleFocus} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} />;
}
