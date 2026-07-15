import { useCallback, type ChangeEvent } from "react";

type AdditionalSqlPanelProps = {
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
};

export function AdditionalSqlPanel({ value, canEdit, onChange }: AdditionalSqlPanelProps) {
  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value), [onChange]);
  return <div className="mx-auto max-w-4xl p-6"><label className="block"><span className="text-sm font-bold text-slate-700">DDL extension</span><textarea className="textarea textarea-bordered mt-2 h-80 w-full font-mono text-sm" value={value} readOnly={!canEdit} onChange={handleChange} placeholder={"ALTER TABLE ...;\n\nThis text is appended after generated table, index, and partition DDL."}/></label><p className="mt-2 text-xs text-slate-500">Stored verbatim. It does not change structured fields, indexes, or partition definitions.</p></div>;
}
