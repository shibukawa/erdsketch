import type {
  PointerEvent,
  PointerEventHandler,
  RefObject,
  WheelEventHandler
} from "react";
import type { Collaborator } from "../../collaboration";
import type { CardDisplayMode, DragState, ModelSeed, Relationship, RelationshipReference, Viewport } from "../../features/modeling/types";
import { getCardBoundaryPoint, getRelationshipDropTarget } from "../../features/modeling/utils";
import { ModelSeedCard } from "./ModelSeedCard";
import { RemoteCursor } from "./RemoteCursor";
import { RelationshipLink } from "./RelationshipLink";
import { RoughLink } from "./RoughLink";

type DiagramCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  dragState: DragState;
  viewport: Viewport;
  seeds: ModelSeed[];
  allSeeds: ModelSeed[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  selectedId: string;
  displayMode: CardDisplayMode;
  locks: Record<string, Collaborator>;
  me: Collaborator;
  remoteUsers: Collaborator[];
  onDoubleClick: React.MouseEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerLeave: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onWheel: WheelEventHandler<HTMLDivElement>;
  onSeedPointerDown: (event: PointerEvent<HTMLElement>, seed: ModelSeed) => void;
  onUpdateSeed: (seedId: string, patch: Partial<ModelSeed>) => void;
  onUnlockSeed: (seedId: string) => void;
  onRelationshipPointerDown: (event: PointerEvent<HTMLButtonElement>, seed: ModelSeed) => void;
  onEditRelationship: (relationshipId: string) => void;
  onUpdateRelationshipReference: (relationshipId: string, patch: Partial<RelationshipReference>) => void;
  onDeleteRelationship: (relationshipId: string) => void;
};

export function DiagramCanvas({
  canvasRef,
  dragState,
  viewport,
  seeds,
  allSeeds,
  relationships,
  relationshipReferences,
  selectedId,
  displayMode,
  locks,
  me,
  remoteUsers,
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onWheel,
  onSeedPointerDown,
  onUpdateSeed,
  onUnlockSeed,
  onRelationshipPointerDown,
  onEditRelationship,
  onUpdateRelationshipReference,
  onDeleteRelationship
}: DiagramCanvasProps) {
  const relationshipDropTargetId = dragState?.type === "relationship"
    ? getRelationshipDropTarget(dragState.sourceId, dragState, allSeeds)?.id
    : undefined;

  return (
    <div
      ref={canvasRef}
      className={`erd-canvas relative min-h-0 flex-1 overflow-hidden ${dragState?.type === "pan" ? "cursor-grabbing" : "cursor-grab"}`}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div
        className="absolute left-0 top-0 h-[2400px] w-[3200px] origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        <div className="pointer-events-none absolute inset-0">
          {relationships.map((relationship) => <RelationshipLink key={relationship.id} relationship={relationship} seeds={allSeeds} onEdit={onEditRelationship} />)}
          {dragState?.type === "relationship" && (() => {
            const source = allSeeds.find((seed) => seed.id === dragState.sourceId);
            if (!source) return null;
            const start = getCardBoundaryPoint(source, dragState);
            const dx = dragState.x - start.x;
            const dy = dragState.y - start.y;
            const horizontal = Math.abs(dx) >= Math.abs(dy);
            const control1 = horizontal ? { x: start.x + dx * 0.42, y: start.y } : { x: start.x, y: start.y + dy * 0.42 };
            const control2 = horizontal ? { x: dragState.x - dx * 0.42, y: dragState.y } : { x: dragState.x, y: dragState.y - dy * 0.42 };
            return <RoughLink path={`M${start.x} ${start.y} C${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${dragState.x} ${dragState.y}`} roughness={source.maturedLevel} />;
          })()}
        </div>

        {seeds.map((seed) => (
          <ModelSeedCard
            key={seed.id}
            seed={seed}
            selected={selectedId === seed.id}
            relationshipDropTarget={relationshipDropTargetId === seed.id}
            displayMode={displayMode}
            owner={locks[seed.id]}
            me={me}
            onPointerDown={onSeedPointerDown}
            onUpdate={onUpdateSeed}
            onUnlock={onUnlockSeed}
            onRelationshipPointerDown={onRelationshipPointerDown}
            relationships={relationships}
            relationshipReferences={relationshipReferences}
            onUpdateRelationshipReference={onUpdateRelationshipReference}
            onDeleteRelationship={onDeleteRelationship}
          />
        ))}

        {remoteUsers.map((user) => (
          <RemoteCursor key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
