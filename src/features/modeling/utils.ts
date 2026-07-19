import type { DataDomain, ExpandedDomainField, ModelField, ModelSeed, Multiplicity, NameDisplayMode, NameSet, Relationship, RelationshipDirection, RelationshipReference } from "./types";
import { cardHeight, cardWidth } from "./constants.ts";

export const clampScale = (scale: number) => Math.min(2.4, Math.max(0.35, scale));

let measurementContext: CanvasRenderingContext2D | null | undefined;
const measuredTextWidths = new Map<string, number>();

type CardTextKind = "title" | "tag" | "description";

function estimateTextWidth(value: string, kind: CardTextKind) {
  const scale = kind === "title" ? 1 : kind === "tag" ? 0.6 : 0.7;
  return [...value].reduce((width, character) => {
    if (/\s/u.test(character)) return width + 6;
    if (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff00-\uffef]/u.test(character)) return width + 20;
    if (/[A-Z0-9]/u.test(character)) return width + 13;
    return width + 10.5;
  }, 0) * scale;
}

function measureCardText(value: string, kind: CardTextKind) {
  const key = `${kind}:${value}`;
  const cached = measuredTextWidths.get(key);
  if (cached !== undefined) return cached;
  if (measurementContext === undefined && typeof document !== "undefined") measurementContext = document.createElement("canvas").getContext("2d");
  if (!measurementContext) return estimateTextWidth(value, kind);
  measurementContext.font = kind === "title"
    ? "700 20px ui-sans-serif, system-ui, sans-serif"
    : kind === "tag" ? "600 12px ui-sans-serif, system-ui, sans-serif" : "400 14px ui-sans-serif, system-ui, sans-serif";
  const width = measurementContext.measureText(value).width;
  measuredTextWidths.set(key, width);
  return width;
}

export function getModelCardWidth(displayName: string, tags: string[] = []) {
  const titleRequiredWidth = measureCardText(displayName, "title") + 80;
  const tagsRequiredWidth = tags.reduce((width, tag) => width + measureCardText(tag, "tag") + 18, 0) + Math.max(0, tags.length - 1) * 6 + 32;
  return Math.max(cardWidth, Math.ceil(titleRequiredWidth), Math.ceil(tagsRequiredWidth));
}

function wrappedDescriptionLineCount(value: string, availableWidth: number) {
  return value.split("\n").reduce((total, paragraph) => {
    if (!paragraph) return total + 1;
    const tokens = paragraph.match(/\S+\s*/gu) ?? [paragraph];
    let lines = 1;
    let lineWidth = 0;
    for (const token of tokens) {
      const tokenWidth = measureCardText(token, "description");
      if (tokenWidth <= availableWidth) {
        if (lineWidth > 0 && lineWidth + tokenWidth > availableWidth) {
          lines += 1;
          lineWidth = tokenWidth;
        } else lineWidth += tokenWidth;
        continue;
      }
      for (const character of token) {
        const characterWidth = measureCardText(character, "description");
        if (lineWidth > 0 && lineWidth + characterWidth > availableWidth) {
          lines += 1;
          lineWidth = characterWidth;
        } else lineWidth += characterWidth;
      }
    }
    return total + lines;
  }, 0);
}

export function getModelDescriptionCardHeight(description: string, width: number) {
  const lineCount = wrappedDescriptionLineCount(description, Math.max(80, width - 40));
  const bodyHeight = Math.max(64, lineCount * 20 + 8);
  return cardHeight + bodyHeight - 64;
}

export function toSnakeCase(value: string) {
  return value
    .normalize("NFKC")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

export function normalizeNames(legacyName: string, names?: Partial<NameSet>): NameSet {
  return {
    business: names?.business?.trim() || legacyName,
    system: names?.system?.trim() || names?.business?.trim() || legacyName,
    physical: names?.physical?.trim() || toSnakeCase(names?.system || names?.business || legacyName)
  };
}

export function getDisplayName(legacyName: string, names: Partial<NameSet> | undefined, mode: NameDisplayMode) {
  return normalizeNames(legacyName, names)[mode];
}

export function updateNameSet(legacyName: string, names: Partial<NameSet> | undefined, mode: NameDisplayMode, value: string): NameSet {
  return { ...normalizeNames(legacyName, names), [mode]: value };
}

function primitivePhysicalTypeLabel(domain: DataDomain) {
  if (!domain.primitiveType) return undefined;
  if (domain.primitiveType === "code_set") {
    const baseType = (domain.codeSetBaseType ?? "varchar").toUpperCase();
    return domain.codeSetBaseType === "varchar" || !domain.codeSetBaseType
      ? `${baseType}${domain.length ? `(${domain.length})` : ""}`
      : baseType;
  }
  const type = domain.primitiveType.replace(/_/g, " ").toUpperCase();
  if (domain.primitiveType === "varchar") return `${type}${domain.length ? `(${domain.length})` : ""}`;
  if (domain.primitiveType === "decimal") return `${type}${domain.precision ? `(${domain.precision}, ${domain.scale ?? 0})` : ""}`;
  if ((domain.primitiveType === "integer" || domain.primitiveType === "floating_point") && domain.bits) return `${type} · ${domain.bits} bit`;
  return type;
}

export function getDomainPhysicalTypeLabel(domainId: string | undefined, domains: DataDomain[], seen = new Set<string>()): string | undefined {
  const domain = domains.find((candidate) => candidate.id === domainId);
  if (!domain || seen.has(domain.id)) return undefined;
  const primitive = primitivePhysicalTypeLabel(domain);
  if (primitive) return primitive;
  seen.add(domain.id);
  if (domain.shape === "scalar" && domain.components.length === 1) return getDomainPhysicalTypeLabel(domain.components[0].domainId, domains, seen);
  if (domain.shape === "composite" && domain.components.length > 0) {
    const componentTypes = domain.components.map((component) => getDomainPhysicalTypeLabel(component.domainId, domains, new Set(seen)));
    return componentTypes.every((value): value is string => Boolean(value)) ? componentTypes.join(" + ") : undefined;
  }
  return undefined;
}

export const getModelStageLabel = (maturedLevel: number) => {
  if (maturedLevel <= 0.5) return "Matured model";
  if (maturedLevel <= 1.25) return "Logical model";
  if (maturedLevel <= 3.5) return "Concept model";
  return "Model seed";
};

export function flattenLabels(seed: ModelSeed) {
  return [seed.dependency, seed.role, ...(seed.hasPrivacy ? ["privacy"] : [])];
}

export const isMany = (multiplicity: Multiplicity) => multiplicity === "0..*" || multiplicity === "1..*";

export function normalizeRelationshipSemantics(relationship: Relationship): Relationship {
  const name = relationship.name.trim();
  if (relationship.kind === "composition") return { ...relationship, name, onDelete: "cascade" };
  if (relationship.kind === "foreign-key") return { ...relationship, name, onDelete: relationship.onDelete ?? "no_action" };
  return { ...relationship, name, onDelete: undefined };
}

export function upgradeLegacyHistoryRelationship(relationship: Relationship, source?: ModelSeed, target?: ModelSeed): Relationship {
  if (relationship.kind !== "label" || relationship.name.trim().toLowerCase() !== "history") return relationship;
  const sourceIsHistory = source?.role === "history";
  const targetIsHistory = target?.role === "history";
  if (sourceIsHistory === targetIsHistory) return relationship;
  return normalizeRelationshipSemantics({
    ...relationship,
    sourceId: sourceIsHistory ? relationship.targetId : relationship.sourceId,
    targetId: sourceIsHistory ? relationship.sourceId : relationship.targetId,
    sourceMultiplicity: "1",
    targetMultiplicity: "1..*",
    direction: "source-to-target",
    kind: "foreign-key"
  });
}

export function relationshipDisplaySeedIDs(relationship: Relationship) {
  if (relationship.kind === "composition") return [relationship.sourceId];
  if (relationship.kind === "inherit" || relationship.kind === "label") return [relationship.sourceId, relationship.targetId];
  const sourceMany = isMany(relationship.sourceMultiplicity);
  const targetMany = isMany(relationship.targetMultiplicity);
  if (sourceMany && targetMany) return [relationship.sourceId, relationship.targetId];
  if (sourceMany) return [relationship.sourceId];
  if (targetMany) return [relationship.targetId];
  return [relationship.direction === "source-to-target" ? relationship.sourceId : relationship.targetId];
}

export function relationshipForeignKeyNullable(relationship: Relationship) {
  const sourceMany = isMany(relationship.sourceMultiplicity);
  const targetMany = isMany(relationship.targetMultiplicity);
  if (sourceMany && !targetMany) return relationship.targetMultiplicity === "0..1";
  if (targetMany && !sourceMany) return relationship.sourceMultiplicity === "0..1";
  if (sourceMany && targetMany) return false;
  return relationship.direction === "source-to-target" ? relationship.targetMultiplicity === "0..1" : relationship.sourceMultiplicity === "0..1";
}

export function relationshipVisibleOnCanvas(relationship: Relationship, references: RelationshipReference[]) {
  const reference = getRelationshipReference(references, relationship.id);
  return !reference || (reference.hiddenOnModelIds ?? []).length === 0;
}

export function getRelationshipReference(relationshipReferences: RelationshipReference[], relationshipId: string) {
  return relationshipReferences.find((reference) => reference.relationshipId === relationshipId);
}

export function expandDomainField(field: ModelField, domains: DataDomain[]): ExpandedDomainField[] {
  const domain = domains.find((item) => item.id === field.domainId);
  const logicalName = getFieldEffectiveName(field, domains);
  if (!domain || domain.shape !== "composite") {
    return [{ name: logicalName, domainId: field.domainId ?? "", partitionKey: domain?.partitionKey ?? false }];
  }
  return domain.components.map((component) => ({
    name: `${logicalName}${component.name.replace(/\s+/g, "")}`,
    domainId: component.domainId ?? "",
    componentId: component.id,
    partitionKey: component.partitionKey ?? false
  }));
}

export function getFieldEffectiveName(field: ModelField, domains: DataDomain[], mode: NameDisplayMode = "system") {
  const domain = domains.find((item) => item.id === field.domainId);
  const fieldName = getDisplayName(field.name, field.names, mode);
  return field.useDomainName && domain ? `${fieldName}${getDisplayName(domain.name, domain.names, mode)}` : fieldName;
}

export function isPartitionKeyField(field: ModelField, domains: DataDomain[]) {
  return expandDomainField(field, domains).some((expanded) => expanded.partitionKey);
}

export function isAssignableDomain(domain: DataDomain | undefined) {
  return !!domain;
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

function cardBoundaryIntersection(seed: ModelSeed, toward: Point, cardWidths?: Record<string, number>, cardHeights?: Record<string, number>) {
  const width = cardWidths?.[seed.id] ?? cardWidth;
  const height = cardHeights?.[seed.id] ?? cardHeight;
  const center = { x: seed.x + width / 2, y: seed.y + height / 2 };
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { point: { x: center.x + width / 2, y: center.y }, edge: "right" as const };
  }
  const horizontalScale = dx === 0 ? Number.POSITIVE_INFINITY : width / 2 / Math.abs(dx);
  const verticalScale = dy === 0 ? Number.POSITIVE_INFINITY : height / 2 / Math.abs(dy);
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

export function getCardBoundaryPoint(seed: ModelSeed, toward: Point, cardWidths?: Record<string, number>, cardHeights?: Record<string, number>) {
  return cardBoundaryIntersection(seed, toward, cardWidths, cardHeights).point;
}

export function getRelationshipGeometry(relationship: Relationship, seeds: ModelSeed[], cardWidths?: Record<string, number>, cardHeights?: Record<string, number>) {
  const source = seeds.find((seed) => seed.id === relationship.sourceId);
  const target = seeds.find((seed) => seed.id === relationship.targetId);
  if (!source || !target) return undefined;
  const sourceCenter = { x: source.x + (cardWidths?.[source.id] ?? cardWidth) / 2, y: source.y + (cardHeights?.[source.id] ?? cardHeight) / 2 };
  const targetCenter = { x: target.x + (cardWidths?.[target.id] ?? cardWidth) / 2, y: target.y + (cardHeights?.[target.id] ?? cardHeight) / 2 };
  const sourceIntersection = cardBoundaryIntersection(source, targetCenter, cardWidths, cardHeights);
  const targetIntersection = cardBoundaryIntersection(target, sourceCenter, cardWidths, cardHeights);
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
    sourcePoint: start,
    sourceTangent: { x: control1.x - start.x, y: control1.y - start.y },
    sourceLabel: offsetMultiplicityLabel(start, sourceIntersection.edge),
    targetLabel: offsetMultiplicityLabel(end, targetIntersection.edge),
    namePosition: cubicPoint(start, control1, control2, end, 0.5)
  };
}

export function getCompositionDiamondPath(relationship: Relationship, seeds: ModelSeed[], cardWidths?: Record<string, number>, cardHeights?: Record<string, number>) {
  if (relationship.kind !== "composition") return undefined;
  const geometry = getRelationshipGeometry(relationship, seeds, cardWidths, cardHeights);
  if (!geometry) return undefined;
  const length = Math.hypot(geometry.sourceTangent.x, geometry.sourceTangent.y);
  if (length < 0.001) return undefined;
  const unitX = geometry.sourceTangent.x / length;
  const unitY = geometry.sourceTangent.y / length;
  const perpendicularX = -unitY;
  const perpendicularY = unitX;
  const tip = geometry.sourcePoint;
  const middle = { x: tip.x + unitX * 9, y: tip.y + unitY * 9 };
  const far = { x: tip.x + unitX * 18, y: tip.y + unitY * 18 };
  const sideA = { x: middle.x + perpendicularX * 6.5, y: middle.y + perpendicularY * 6.5 };
  const sideB = { x: middle.x - perpendicularX * 6.5, y: middle.y - perpendicularY * 6.5 };
  return `M${tip.x} ${tip.y} L${sideA.x} ${sideA.y} L${far.x} ${far.y} L${sideB.x} ${sideB.y} Z`;
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

export function getRelatedDragSeedIDs(startSeed: ModelSeed, seeds: ModelSeed[], relationships: Relationship[], relationshipReferences: RelationshipReference[]) {
  if (startSeed.dependency !== "independent") return [startSeed.id];
  const ids = new Set<string>([startSeed.id]);
  const queue = [startSeed.id];
  while (queue.length > 0) {
    const currentID = queue.shift()!;
    for (const relationship of relationships) {
      if (!relationshipVisibleOnCanvas(relationship, relationshipReferences)) continue;
      const neighborID = relationship.sourceId === currentID ? relationship.targetId : relationship.targetId === currentID ? relationship.sourceId : undefined;
      const neighbor = seeds.find((seed) => seed.id === neighborID);
      if (neighbor && neighbor.dependency === "dependent" && !ids.has(neighbor.id)) {
        ids.add(neighbor.id);
        queue.push(neighbor.id);
      }
    }
  }
  return seeds.filter((seed) => ids.has(seed.id)).map((seed) => seed.id);
}

export function getRelationshipDropTarget(sourceId: string, point: { x: number; y: number }, seeds: ModelSeed[], cardWidths?: Record<string, number>, cardHeights?: Record<string, number>) {
  return seeds.find(
    (seed) => seed.id !== sourceId && point.x >= seed.x && point.x <= seed.x + (cardWidths?.[seed.id] ?? cardWidth) && point.y >= seed.y && point.y <= seed.y + (cardHeights?.[seed.id] ?? cardHeight)
  );
}
