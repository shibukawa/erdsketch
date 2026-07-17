import type {
  PointerEvent,
  PointerEventHandler,
  RefObject
} from "react";
import type { Collaborator } from "../../collaboration";
import type { CanvasModelPlacement, CardDisplayMode, DataDomain, DomainCategory, DragState, ModelSeed, NameDisplayMode, RefinementResult, Relationship, RelationshipReference, Viewport } from "../../features/modeling/types";
import { getCardBoundaryPoint, getRelationshipDropTarget, relationshipVisibleOnCanvas } from "../../features/modeling/utils";
import { ModelSeedCard } from "./ModelSeedCard";
import { RemoteCursor } from "./RemoteCursor";
import { RelationshipLink } from "./RelationshipLink";
import { RoughLink } from "./RoughLink";
import { CanvasTips } from "./CanvasTips";
import type { VocabularyMatchCache } from "../../features/modeling/vocabulary";
import type { AnnotationAnchor, CanvasPoint } from "../../features/annotations/types";
import type { CanvasAnnotationController } from "../../features/annotations/useCanvasAnnotations";
import { CanvasAnnotationLayer } from "../annotations/CanvasAnnotationLayer";
import { AnnotationToolbar } from "../annotations/AnnotationToolbar";

type DiagramCanvasProps = {
  canvasRef: RefObject<HTMLDivElement | null>;
  dragState: DragState;
  viewport: Viewport;
  seeds: ModelSeed[];
  allSeeds: ModelSeed[];
  projectSeeds: ModelSeed[];
  placements: CanvasModelPlacement[];
  activeCanvasId: string;
  titleFocusSeedId: string | null;
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
  domainCategories: DomainCategory[];
  selectedId: string;
  displayMode: CardDisplayMode;
  nameDisplayMode: NameDisplayMode;
  vocabularyCache: VocabularyMatchCache;
  locks: Record<string, Collaborator>;
  me: Collaborator;
  remoteUsers: Collaborator[];
  onDoubleClick: React.MouseEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerLeave: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onSeedPointerDown: (event: PointerEvent<HTMLElement>, seed: ModelSeed) => void;
  onUpdateSeed: (seedId: string, patch: Partial<ModelSeed>) => void;
  onModelEditingChange: (seedId: string, editing: boolean) => void;
  onTitleFocusHandled: (seedId: string) => void;
  onUnlockSeed: (seedId: string) => void;
  onRelationshipPointerDown: (event: PointerEvent<HTMLButtonElement>, seed: ModelSeed) => void;
  onEditRelationship: (relationshipId: string) => void;
  onUpdateRelationshipReference: (relationshipId: string, patch: Partial<RelationshipReference>) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onCreateDomain: (name: string) => void;
  onOpenDomainDictionary: (seedId: string, fieldId?: string) => void;
  onApplyRefinement: (result: RefinementResult) => Promise<boolean>;
  annotationController: CanvasAnnotationController;
  annotationUsers: Collaborator[];
  resolveAnnotationAnchor: (anchor: AnnotationAnchor) => CanvasPoint;
  onResetView: () => void;
  onUpdateScale: (scale: number) => void;
};

export function DiagramCanvas({
  canvasRef,
  dragState,
  viewport,
  seeds,
  allSeeds,
  projectSeeds,
  placements,
  activeCanvasId,
  titleFocusSeedId,
  relationships,
  relationshipReferences,
  domains,
  domainCategories,
  selectedId,
  displayMode,
  nameDisplayMode,
  vocabularyCache,
  locks,
  me,
  remoteUsers,
  onDoubleClick,
  onPointerDown,
  onPointerMove,
  onPointerLeave,
  onPointerUp,
  onSeedPointerDown,
  onUpdateSeed,
  onModelEditingChange,
  onTitleFocusHandled,
  onUnlockSeed,
  onRelationshipPointerDown,
  onEditRelationship,
  onUpdateRelationshipReference,
  onDeleteRelationship,
  onCreateDomain,
  onOpenDomainDictionary,
  onApplyRefinement,
  annotationController,
  annotationUsers,
  resolveAnnotationAnchor,
  onResetView,
  onUpdateScale
}: DiagramCanvasProps) {
  const relationshipDropTargetId = dragState?.type === "relationship"
    ? getRelationshipDropTarget(dragState.sourceId, dragState, allSeeds)?.id
    : undefined;

  return (
    <div
      data-tour="erd-canvas"
      ref={canvasRef}
      className={`erd-canvas relative min-h-0 flex-1 overflow-hidden ${dragState?.type === "pan" ? "cursor-grabbing" : "cursor-grab"}`}
      style={{
        backgroundPosition: `${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px, ${viewport.x}px ${viewport.y}px`,
        backgroundSize: `${24 * viewport.scale}px ${24 * viewport.scale}px, ${120 * viewport.scale}px ${120 * viewport.scale}px, ${120 * viewport.scale}px ${120 * viewport.scale}px`
      }}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute left-0 top-0 h-[2400px] w-[3200px] origin-top-left"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        <CanvasAnnotationLayer layer="background" controller={annotationController} users={annotationUsers} me={me} resolveAnchor={resolveAnnotationAnchor} />
        <div className="pointer-events-none absolute inset-0">
          {relationships.filter((relationship) => relationshipVisibleOnCanvas(relationship, relationshipReferences)).map((relationship) => <RelationshipLink key={relationship.id} relationship={relationship} seeds={allSeeds} onEdit={onEditRelationship} />)}
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
            nameDisplayMode={nameDisplayMode}
            vocabularyCache={vocabularyCache}
            owner={locks[seed.id]}
            me={me}
            accessMode={placements.find((placement) => placement.canvasId === activeCanvasId && placement.seedId === seed.id)?.accessMode ?? "readonly"}
            titleFocusRequested={titleFocusSeedId === seed.id}
            onTitleFocusHandled={onTitleFocusHandled}
            onPointerDown={onSeedPointerDown}
            onUpdate={onUpdateSeed}
            onEditingChange={onModelEditingChange}
            remoteEditor={annotationUsers.find((user) => user.id !== me.id && user.editingModelId === seed.id)}
            onUnlock={onUnlockSeed}
            onRelationshipPointerDown={onRelationshipPointerDown}
            relationships={relationships}
            relationshipReferences={relationshipReferences}
            domains={domains}
            domainCategories={domainCategories}
            onUpdateRelationshipReference={onUpdateRelationshipReference}
            onDeleteRelationship={onDeleteRelationship}
            onCreateDomain={onCreateDomain}
            onOpenDomainDictionary={onOpenDomainDictionary}
            seeds={projectSeeds}
            onApplyRefinement={onApplyRefinement}
          />
        ))}

        {remoteUsers.map((user) => (
          <RemoteCursor key={user.id} user={user} />
        ))}
        <CanvasAnnotationLayer layer="foreground" controller={annotationController} users={annotationUsers} me={me} resolveAnchor={resolveAnnotationAnchor} />
      </div>
      <AnnotationToolbar controller={annotationController} />
      <CanvasTips scale={viewport.scale} onResetView={onResetView} onUpdateScale={onUpdateScale} />
    </div>
  );
}
