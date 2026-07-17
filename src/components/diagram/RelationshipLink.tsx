import { useCallback } from "react";
import type { ModelSeed, Relationship } from "../../features/modeling/types";
import { getCompositionDiamondPath, getRelationshipGeometry, getRelationshipRoughness, relationshipDirectionEndpoints } from "../../features/modeling/utils";
import { RoughLink } from "./RoughLink";

type RelationshipLinkProps = {
  relationship: Relationship;
  seeds: ModelSeed[];
  onEdit: (relationshipId: string) => void;
};

export function RelationshipLink({ relationship, seeds, onEdit }: RelationshipLinkProps) {
  const source = seeds.find((seed) => seed.id === relationship.sourceId);
  const target = seeds.find((seed) => seed.id === relationship.targetId);
  const geometry = getRelationshipGeometry(relationship, seeds);
  const handleEdit = useCallback(() => onEdit(relationship.id), [onEdit, relationship.id]);
  if (!source || !target || !geometry) return null;
  const { originId } = relationshipDirectionEndpoints(relationship);
  const originIsSource = originId === source.id;

  return (
    <>
      <RoughLink path={geometry.path} roughness={getRelationshipRoughness(relationship, seeds)} arrowPath={relationship.kind === "label" ? undefined : geometry.arrowPath} diamondPath={getCompositionDiamondPath(relationship, seeds)} />
      {relationship.kind !== "label" && <><span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600 shadow-sm" style={{ left: geometry.sourceLabel.x, top: geometry.sourceLabel.y }}>
        {relationship.sourceMultiplicity}
      </span>
      <span className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600 shadow-sm" style={{ left: geometry.targetLabel.x, top: geometry.targetLabel.y }}>
        {relationship.targetMultiplicity}
      </span></>}
      <button
        type="button"
        data-no-pan="true"
        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent px-1 py-0.5 text-[11px] font-semibold text-slate-950 transition hover:text-blue-700"
        style={{ left: geometry.namePosition.x, top: geometry.namePosition.y, fontSize: 11, fontWeight: 600, lineHeight: 1, WebkitTextStroke: "4px white", paintOrder: "stroke fill" }}
        onClick={handleEdit}
        aria-label={`Edit ${relationship.name} relationship`}
        title={relationship.kind === "label" ? `Label: ${relationship.name}` : `${relationship.kind ?? "foreign-key"} · ${originIsSource ? "Source to target" : "Target to source"}: ${relationship.name}`}
      >
        {relationship.name}
      </button>
    </>
  );
}
