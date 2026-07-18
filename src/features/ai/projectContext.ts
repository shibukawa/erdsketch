import type { AiSurfaceContext, AiWorkspaceSource } from "./types";

function modelProjection(model: AiWorkspaceSource["models"][number]) {
  return {
    id: model.id,
    title: model.title,
    names: model.names,
    description: model.description,
    role: model.role,
    dependency: model.dependency,
    hasPrivacy: model.hasPrivacy,
    maturity: model.maturedLevel,
    fields: model.fields.map((field) => ({
      id: field.id,
      name: field.name,
      names: field.names,
      domainId: field.domainId,
      primaryKey: field.primaryKey,
      important: field.important,
      required: field.required,
      unique: field.unique,
      defaultValue: field.defaultValue,
      valueGeneration: field.valueGeneration,
      estimatedAverageSizeBytes: field.estimatedAverageSizeBytes
    })),
    indexes: model.indexes,
    partitioning: model.partitioning,
    volumeEstimate: model.volumeEstimate
  };
}

export function createAiReviewContext(source: AiWorkspaceSource, surface: AiSurfaceContext) {
  const selectedModelIds = new Set(surface.selectedModelIds?.length ? surface.selectedModelIds : source.canvasModelIds);
  const relationships = source.relationships.filter((relationship) => selectedModelIds.has(relationship.sourceId) || selectedModelIds.has(relationship.targetId));
  for (const relationship of relationships) {
    selectedModelIds.add(relationship.sourceId);
    selectedModelIds.add(relationship.targetId);
  }
  const models = source.models.filter((model) => selectedModelIds.has(model.id));
  const domainIds = new Set(models.flatMap((model) => model.fields.map((field) => field.domainId).filter((id): id is string => Boolean(id))));
  const activeDfdNodes = source.dfd.nodes.filter((node) => node.canvasId === source.activeCanvas.id);
  const activeDfdNodeIds = new Set(activeDfdNodes.map((node) => node.id));

  return {
    formatVersion: 1,
    task: "chat_modeling_advice",
    project: source.project,
    surface: {
      kind: surface.kind,
      id: surface.id,
      title: surface.title,
      canvas: source.activeCanvas
    },
    selection: {
      modelIds: surface.selectedModelIds ?? [],
      attributeIds: surface.selectedAttributeIds ?? [],
      processOrFlowIds: surface.selectedProcessOrFlowIds ?? []
    },
    models: models.map(modelProjection),
    domains: source.domains.filter((domain) => domainIds.has(domain.id)).map((domain) => ({
      id: domain.id,
      name: domain.name,
      names: domain.names,
      shape: domain.shape,
      primitiveType: domain.primitiveType,
      bits: domain.bits,
      unsigned: domain.unsigned,
      length: domain.length,
      precision: domain.precision,
      scale: domain.scale,
      codeSetBaseType: domain.codeSetBaseType,
      codeSetEntries: domain.codeSetEntries,
      components: domain.components
    })),
    relationships,
    relationshipReferences: source.relationshipReferences.filter((reference) => relationships.some((relationship) => relationship.id === reference.relationshipId)),
    dataFlow: source.activeCanvas.kind === "dfd" ? {
      nodes: activeDfdNodes.map(({ x: _x, y: _y, timestamp: _timestamp, ...node }) => node),
      groups: source.dfd.groups.filter((group) => group.canvasId === source.activeCanvas.id),
      flows: source.dfd.flows.filter((flow) => flow.canvasId === source.activeCanvas.id && (activeDfdNodeIds.has(flow.sourceId) || activeDfdNodeIds.has(flow.destinationId)))
    } : undefined
  };
}
