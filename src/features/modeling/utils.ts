import type { ModelSeed, Multiplicity, Relationship, RelationshipDirection, RelationshipReference } from "./types";
import { cardHeight, cardWidth } from "./constants";

export const clampScale = (scale: number) => Math.min(2.4, Math.max(0.35, scale));

export const clampMaturedLevel = (maturedLevel: number) => Math.min(6, Math.max(0.5, maturedLevel));

export const getModelStageLabel = (maturedLevel: number) => {
  if (maturedLevel <= 0.5) return "MATURED MODEL";
  if (maturedLevel <= 1.25) return "LOGICAL MODEL";
  if (maturedLevel <= 3.5) return "CONCEPTUAL MODEL";
  return "MODEL SEED";
};

export function flattenLabels(seed: ModelSeed) {
  return [seed.dependency, seed.role, ...(seed.hasPrivacy ? ["privacy"] : [])];
}

export const isMany = (multiplicity: Multiplicity) => multiplicity === "0..*" || multiplicity === "1..*";

export function relationshipDisplaySeedIDs(relationship: Relationship) {
  const sourceMany = isMany(relationship.sourceMultiplicity);
  const targetMany = isMany(relationship.targetMultiplicity);
  if (sourceMany && targetMany) return [relationship.sourceId, relationship.targetId];
  if (sourceMany) return [relationship.sourceId];
  if (targetMany) return [relationship.targetId];
  return [relationship.direction === "source-to-target" ? relationship.sourceId : relationship.targetId];
}

export function getRelationshipReference(relationshipReferences: RelationshipReference[], relationshipId: string) {
  return relationshipReferences.find((reference) => reference.relationshipId === relationshipId);
}

export function sortFieldListItems(fields: ModelSeed["fields"], references: RelationshipReference[]) {
  const fieldItems = fields.map((field, index) => ({ type: "field" as const, item: field, index }));
  const referenceItems = references.map((reference, index) => ({ type: "reference" as const, item: reference, index: fields.length + index }));
  const rank = (primaryKey: boolean, foreignKey = false) => (primaryKey ? 0 : foreignKey ? 1 : 2);
  return [...fieldItems, ...referenceItems].sort(
    (left, right) =>
      rank(left.item.primaryKey, left.type === "reference" ? left.item.foreignKey : false) -
        rank(right.item.primaryKey, right.type === "reference" ? right.item.foreignKey : false) ||
      left.index - right.index
  );
}

type Point = { x: number; y: number };
type CardEdge = "left" | "right" | "top" | "bottom";

function cardBoundaryIntersection(seed: ModelSeed, toward: Point) {
  const center = { x: seed.x + cardWidth / 2, y: seed.y + cardHeight / 2 };
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { point: { x: center.x + cardWidth / 2, y: center.y }, edge: "right" as const };
  }
  const horizontalScale = dx === 0 ? Number.POSITIVE_INFINITY : cardWidth / 2 / Math.abs(dx);
  const verticalScale = dy === 0 ? Number.POSITIVE_INFINITY : cardHeight / 2 / Math.abs(dy);
  const scale = Math.min(horizontalScale, verticalScale);
  const edge: CardEdge = horizontalScale <= verticalScale ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";
  return { point: { x: center.x + dx * scale, y: center.y + dy * scale }, edge };
}

function offsetMultiplicityLabel(point: Point, edge: CardEdge) {
  switch (edge) {
    case "left":
      return { x: point.x - 24, y: point.y - 18 };
    case "right":
      return { x: point.x + 24, y: point.y - 18 };
    case "top":
      return { x: point.x + 24, y: point.y - 18 };
    case "bottom":
      return { x: point.x + 24, y: point.y + 18 };
  }
}

function cubicPoint(start: Point, control1: Point, control2: Point, end: Point, t: number) {
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * control1.x + 3 * inverse * t ** 2 * control2.x + t ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * control1.y + 3 * inverse * t ** 2 * control2.y + t ** 3 * end.y
  };
}

function arrowHeadPath(tip: Point, tangent: Point) {
  const length = Math.max(1, Math.hypot(tangent.x, tangent.y));
  const unitX = tangent.x / length;
  const unitY = tangent.y / length;
  const base = { x: tip.x - unitX * 13, y: tip.y - unitY * 13 };
  const perpendicular = { x: -unitY * 6, y: unitX * 6 };
  return `M${base.x + perpendicular.x} ${base.y + perpendicular.y} L${tip.x} ${tip.y} L${base.x - perpendicular.x} ${base.y - perpendicular.y}`;
}

export function getCardBoundaryPoint(seed: ModelSeed, toward: Point) {
  return cardBoundaryIntersection(seed, toward).point;
}

export function getRelationshipGeometry(relationship: Relationship, seeds: ModelSeed[]) {
  const source = seeds.find((seed) => seed.id === relationship.sourceId);
  const target = seeds.find((seed) => seed.id === relationship.targetId);
  if (!source || !target) return undefined;
  const sourceCenter = { x: source.x + cardWidth / 2, y: source.y + cardHeight / 2 };
  const targetCenter = { x: target.x + cardWidth / 2, y: target.y + cardHeight / 2 };
  const sourceIntersection = cardBoundaryIntersection(source, targetCenter);
  const targetIntersection = cardBoundaryIntersection(target, sourceCenter);
  const start = sourceIntersection.point;
  const end = targetIntersection.point;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const control1 = horizontal ? { x: start.x + dx * 0.42, y: start.y } : { x: start.x, y: start.y + dy * 0.42 };
  const control2 = horizontal ? { x: end.x - dx * 0.42, y: end.y } : { x: end.x, y: end.y - dy * 0.42 };
  const arrowAtTarget = relationship.direction === "source-to-target";
  const arrowTip = arrowAtTarget ? end : start;
  const arrowTangent = arrowAtTarget
    ? { x: end.x - control2.x, y: end.y - control2.y }
    : { x: start.x - control1.x, y: start.y - control1.y };
  return {
    path: `M${start.x} ${start.y} C${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`,
    arrowPath: arrowHeadPath(arrowTip, arrowTangent),
    sourceLabel: offsetMultiplicityLabel(start, sourceIntersection.edge),
    targetLabel: offsetMultiplicityLabel(end, targetIntersection.edge),
    namePosition: cubicPoint(start, control1, control2, end, 0.5)
  };
}

export function getRelationshipRoughness(relationship: Relationship, seeds: ModelSeed[]) {
  const source = seeds.find((seed) => seed.id === relationship.sourceId);
  const target = seeds.find((seed) => seed.id === relationship.targetId);
  if (!source || !target) return 3.5;
  return (source.maturedLevel + target.maturedLevel) / 2;
}

export function relationshipDirectionEndpoints(relationship: Relationship, direction: RelationshipDirection = relationship.direction) {
  return direction === "source-to-target"
    ? { originId: relationship.sourceId, destinationId: relationship.targetId }
    : { originId: relationship.targetId, destinationId: relationship.sourceId };
}

export function getRelatedDragSeedIDs(startSeed: ModelSeed, seeds: ModelSeed[], relationships: Relationship[]) {
  if (startSeed.dependency !== "dependent") return [startSeed.id];
  const ids = new Set<string>([startSeed.id]);
  const queue = [startSeed.id];
  while (queue.length > 0) {
    const currentID = queue.shift()!;
    for (const relationship of relationships) {
      const neighborID = relationship.sourceId === currentID ? relationship.targetId : relationship.targetId === currentID ? relationship.sourceId : undefined;
      const neighbor = seeds.find((seed) => seed.id === neighborID);
      if (neighbor && neighbor.dependency === "independent" && !ids.has(neighbor.id)) {
        ids.add(neighbor.id);
        queue.push(neighbor.id);
      }
    }
  }
  return seeds.filter((seed) => ids.has(seed.id)).map((seed) => seed.id);
}

export function getRelationshipDropTarget(sourceId: string, point: { x: number; y: number }, seeds: ModelSeed[]) {
  return seeds.find(
    (seed) => seed.id !== sourceId && point.x >= seed.x && point.x <= seed.x + cardWidth && point.y >= seed.y && point.y <= seed.y + cardHeight
  );
}
