import { KeyRound, Link2, Trash2 } from "lucide-react";
import { useCallback, type MouseEvent } from "react";
import type { Relationship, RelationshipReference } from "../../features/modeling/types";

type RelationshipReferenceRowProps = {
  relationship: Relationship;
  reference: RelationshipReference;
  canEdit: boolean;
  onTogglePrimaryKey: (relationshipId: string) => void;
  onToggleForeignKey: (relationshipId: string) => void;
  onDelete: (relationshipId: string) => void;
};

export function RelationshipReferenceRow({ relationship, reference, canEdit, onTogglePrimaryKey, onToggleForeignKey, onDelete }: RelationshipReferenceRowProps) {
  const handlePrimaryKey = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onTogglePrimaryKey(relationship.id);
  }, [onTogglePrimaryKey, relationship.id]);
  const handleForeignKey = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleForeignKey(relationship.id);
  }, [onToggleForeignKey, relationship.id]);
  const handleDelete = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (window.confirm(`Delete the “${relationship.name}” relationship?`)) onDelete(relationship.id);
  }, [onDelete, relationship.id, relationship.name]);
  return (
    <li className="grid h-10 grid-cols-[30px_minmax(180px,1fr)_78px_70px_44px_40px] items-center border-b border-slate-100 bg-blue-50/45 text-sm" role="row">
      <span className="flex items-center justify-center text-blue-600"><Link2 size={15} /></span>
      <span className="flex min-w-0 items-center gap-2 truncate px-2 font-mono text-[13px] font-semibold text-blue-900"><span className="truncate">{relationship.name}</span></span>
      <button type="button" disabled={!canEdit} onClick={handlePrimaryKey} aria-pressed={reference.primaryKey} className={`mx-auto flex h-6 min-w-[62px] items-center justify-center rounded-full border px-2 text-[10px] font-extrabold ${reference.primaryKey ? "border-violet-300 bg-violet-100 text-violet-800" : "border-slate-200 bg-white text-slate-400"}`}>PK {reference.primaryKey ? "ON" : "OFF"}</button>
      <button type="button" disabled={!canEdit} onClick={handleForeignKey} aria-pressed={reference.foreignKey} className={`mx-auto flex h-6 min-w-[62px] items-center justify-center rounded-full border px-2 text-[10px] font-extrabold ${reference.foreignKey ? "border-blue-300 bg-blue-100 text-blue-800" : "border-slate-200 bg-white text-slate-400"}`}>FK {reference.foreignKey ? "ON" : "OFF"}</button>
      <span className="mx-auto text-slate-300" title="Relationship references do not use favorite"><KeyRound size={14} /></span>
      <button type="button" disabled={!canEdit} onClick={handleDelete} className="mx-auto flex h-7 w-7 items-center justify-center rounded-md text-slate-300 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${relationship.name} relationship`}><Trash2 size={15} /></button>
    </li>
  );
}
