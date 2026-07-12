import type { DataDomain, ModelField, ModelSeed, RefinementInput, RefinementPatternId, RefinementResult, Relationship, RelationshipReference } from "./types";

export type RefinementContext = {
  seeds: ModelSeed[];
  relationships: Relationship[];
  relationshipReferences: RelationshipReference[];
  domains: DataDomain[];
};

export const refinementPatterns: Array<{ id: RefinementPatternId; title: string; description: string }> = [
  { id: "extract-master", title: "Extract new master model", description: "Move selected fields into a reusable master." },
  { id: "extract-domain", title: "Extract new domain", description: "Replace selected fields with one reusable domain." },
  { id: "create-history", title: "Create history model", description: "Track selected values over time or versions." },
  { id: "multiple-items", title: "Multiple items", description: "Turn selected values into a 1:N or N:M collection." },
  { id: "extract-optional", title: "Extract as optional model", description: "Move optional values behind a 1–0..1 relationship." },
  { id: "extract-one-to-one", title: "Extract model (1:1)", description: "Separate sensitive, heavy, or differently updated values." },
  { id: "split-code-set", title: "Split model by CodeSet", description: "Create a variant model for each selected CodeSet value." },
  { id: "create-work", title: "Create work", description: "Clone the model for staging, sanitizing, or output storage." }
];

export function getFieldCodeSet(field: ModelField, domains: DataDomain[]) {
  if (!field.domainId) return undefined;
  const domain = domains.find((candidate) => candidate.id === field.domainId);
  return domain?.primitiveType === "code_set" && domain.codeSetEntries?.length ? domain : undefined;
}

function normalizedName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function editDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, row) => Array.from({ length: right.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0));
  for (let row = 1; row <= left.length; row += 1) for (let column = 1; column <= right.length; column += 1) rows[row][column] = Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + Number(left[row - 1] !== right[column - 1]));
  return rows[left.length][right.length];
}

export function findSimilarFieldGroups(source: ModelSeed, selectedFieldIds: string[], seeds: ModelSeed[]) {
  const names = source.fields.filter((field) => selectedFieldIds.includes(field.id)).map((field) => normalizedName(field.name)).filter(Boolean);
  return seeds.filter((seed) => seed.id !== source.id).flatMap((seed) => {
    const matches = seed.fields.filter((field) => names.some((name) => {
      const candidate = normalizedName(field.name);
      return candidate.includes(name) || name.includes(candidate) || editDistance(candidate, name) <= Math.max(1, Math.floor(Math.max(candidate.length, name.length) * 0.25));
    }));
    return matches.length >= names.length ? [{ seed, fields: matches.slice(0, names.length) }] : [];
  });
}

export function refinementUnavailableReason(patternId: RefinementPatternId, source: ModelSeed, selected: ModelField[], domains: DataDomain[], canEdit: boolean, selectedRelationshipCount = 0) {
  const missing: string[] = [];
  if (!canEdit) missing.push("Lock this model to apply refinements.");
  if (patternId !== "create-work" && selected.length + selectedRelationshipCount === 0) missing.push("Select at least one field or relationship.");
  if (patternId === "extract-domain" && (selected.some((field) => getFieldCodeSet(field, domains)) || selectedRelationshipCount > 0)) missing.push("CodeSet fields and relationships cannot become a domain.");
  if (patternId === "create-history" && !source.fields.some((field) => field.primaryKey)) missing.push("Add a primary key to the source model.");
  if (patternId === "split-code-set" && (selected.length === 0 || selected.some((field) => !getFieldCodeSet(field, domains)))) missing.push("Select one or more fields assigned to a CodeSet domain with entries.");
  return missing.join(" ");
}

function cloneField(field: ModelField): ModelField {
  return { ...field };
}

function placeSeed(source: ModelSeed, index: number, id: string, title: string, role = source.role): ModelSeed {
  return { ...source, id, title, role, fields: [], x: source.x + 350 + (index % 2) * 330, y: source.y + Math.floor(index / 2) * 260, rotation: 0 };
}

function relationship(id: string, name: string, sourceId: string, targetId: string, sourceMultiplicity: Relationship["sourceMultiplicity"], targetMultiplicity: Relationship["targetMultiplicity"], kind: Relationship["kind"] = "foreign-key"): Relationship {
  return { id, name, sourceId, targetId, sourceMultiplicity, targetMultiplicity, direction: "source-to-target", kind };
}

export function buildRefinement(input: RefinementInput, context: RefinementContext, idFactory: () => string = () => crypto.randomUUID()): RefinementResult {
  const source = context.seeds.find((seed) => seed.id === input.sourceId);
  if (!source) throw new Error("Source model no longer exists.");
  const selected = source.fields.filter((field) => input.selectedFieldIds.includes(field.id));
  const unavailable = refinementUnavailableReason(input.patternId, source, selected, context.domains, true, input.selectedRelationshipIds.length);
  if (unavailable) throw new Error(unavailable);
  if (input.patternId !== "extract-domain" && input.patternId !== "split-code-set" && !input.modelName.trim()) throw new Error("Enter a new model name.");
  if (input.patternId !== "extract-domain" && input.patternId !== "split-code-set" && context.seeds.some((seed) => seed.title.toLowerCase() === input.modelName.trim().toLowerCase())) throw new Error("Model names must be unique.");
  if (["extract-master", "multiple-items", "extract-optional", "extract-one-to-one"].includes(input.patternId) && input.keyMode === "selected" && !selected.some((field) => input.keyFieldIds.includes(field.id))) throw new Error("Select at least one primary-key field.");
  if (input.patternId === "extract-domain" && (!input.domainName.trim() || context.domains.some((domain) => domain.name.toLowerCase() === input.domainName.trim().toLowerCase()))) throw new Error("Enter a unique domain name.");
  const selectedIds = new Set(selected.map((field) => field.id));
  const seeds = context.seeds.map((seed) => ({ ...seed, fields: seed.fields.map(cloneField) }));
  const sourceDraft = seeds.find((seed) => seed.id === source.id)!;
  const relationships = context.relationships.map((item) => ({ ...item }));
  const references = context.relationshipReferences.map((item) => ({ ...item, hiddenOnModelIds: [...(item.hiddenOnModelIds ?? [])] }));
  const selectedRelationshipIds = new Set(input.selectedRelationshipIds);
  const domains = context.domains.map((item) => ({ ...item, components: item.components.map((component) => ({ ...component })) }));
  const createdSeedIds: string[] = [];
  const summary: string[] = [];
  const addSeed = (title: string, fields: ModelField[], role = source.role) => {
    const id = idFactory();
    const seed = placeSeed(source, createdSeedIds.length, id, title.trim() || `Refined ${source.title}`, role);
    seed.fields = fields.map(cloneField);
    seeds.push(seed);
    createdSeedIds.push(id);
    return seed;
  };
  const addRelationship = (value: Relationship, hiddenOnModelIds: string[] = []) => {
    relationships.push(value);
    references.push({ id: idFactory(), relationshipId: value.id, primaryKey: false, foreignKey: value.kind === "foreign-key", hiddenOnModelIds });
  };
  const retarget = (item: Relationship, targetId: string) => item.sourceId === source.id ? { ...item, sourceId: targetId } : { ...item, targetId };
  const moveSelectedRelationships = (targetId: string) => {
    for (let index = 0; index < relationships.length; index += 1) {
      if (!selectedRelationshipIds.has(relationships[index].id)) continue;
      relationships[index] = retarget(relationships[index], targetId);
      const reference = references.find((item) => item.relationshipId === relationships[index].id);
      if (reference) reference.hiddenOnModelIds = reference.hiddenOnModelIds.map((id) => id === source.id ? targetId : id);
    }
  };
  const copySelectedRelationships = (targetId: string, hidden = false) => {
    for (const item of context.relationships.filter((candidate) => selectedRelationshipIds.has(candidate.id))) {
      const copy = retarget({ ...item, id: idFactory() }, targetId);
      addRelationship(copy, hidden ? [targetId] : []);
    }
  };
  const configuredKeys = () => {
    if (input.keyMode === "selected") return selected.filter((field) => input.keyFieldIds.includes(field.id)).map((field) => ({ ...cloneField(field), primaryKey: true, important: true }));
    return [{ id: idFactory(), name: input.newKeyName.trim() || "id", primaryKey: true, important: true, domainId: input.newKeyDomainId }];
  };
  const removeSelected = () => { sourceDraft.fields = sourceDraft.fields.filter((field) => !selectedIds.has(field.id)); };

  if (input.patternId === "extract-domain") {
    const domainId = idFactory();
    domains.push({ id: domainId, name: input.domainName.trim() || `${source.title} fields`, categoryId: "user-defined", shape: selected.length > 1 ? "composite" : "unresolved", components: selected.length > 1 ? selected.map((field) => ({ id: idFactory(), name: field.name, domainId: field.domainId, required: true })) : [] });
    const firstIndex = Math.min(...selected.map((field) => source.fields.findIndex((item) => item.id === field.id)));
    removeSelected();
    sourceDraft.fields.splice(firstIndex, 0, { id: idFactory(), name: "", primaryKey: selected.some((field) => field.primaryKey), important: selected.some((field) => field.important), domainId, useDomainName: true });
    const groups = findSimilarFieldGroups(source, input.selectedFieldIds, context.seeds).filter((group) => input.similarModelIds.includes(group.seed.id));
    for (const group of groups) {
      const draft = seeds.find((seed) => seed.id === group.seed.id)!;
      const ids = new Set(group.fields.map((field) => field.id));
      const index = Math.min(...group.fields.map((field) => group.seed.fields.findIndex((item) => item.id === field.id)));
      draft.fields = draft.fields.filter((field) => !ids.has(field.id));
      draft.fields.splice(index, 0, { id: idFactory(), name: "", primaryKey: group.fields.some((field) => field.primaryKey), important: group.fields.some((field) => field.important), domainId, useDomainName: true });
    }
    summary.push(`Create domain ${input.domainName || `${source.title} fields`}`, `Replace ${selected.length} field(s) on ${source.title}`, `Replace matching fields on ${groups.length} checked model(s)`);
  } else if (input.patternId === "split-code-set") {
    const entries = [...new Map(selected.flatMap((field) => getFieldCodeSet(field, context.domains)?.codeSetEntries ?? []).map((entry) => [entry.id, entry])).values()];
    const generatedNames = entries.map((entry) => (input.codeSetModelNames[entry.id] || `${entry.name} ${source.title}`).trim().toLowerCase());
    if (generatedNames.some((name) => !name) || new Set(generatedNames).size !== generatedNames.length || generatedNames.some((name) => context.seeds.some((seed) => seed.title.toLowerCase() === name))) throw new Error("CodeSet model names must be non-empty and unique.");
    for (const entry of entries) {
      const child = addSeed(input.codeSetModelNames[entry.id] || `${entry.name} ${source.title}`, input.inheritParent ? [] : source.fields.filter((field) => !selectedIds.has(field.id)));
      const rel = relationship(idFactory(), input.inheritParent ? "inherits" : "references", child.id, source.id, "1", "1", input.inheritParent ? "inherit" : "foreign-key");
      addRelationship(rel);
      for (const original of context.relationships.filter((item) => item.sourceId === source.id || item.targetId === source.id)) {
        const copy = retarget({ ...original, id: idFactory() }, child.id);
        addRelationship(copy);
      }
    }
    summary.push(`Create ${entries.length} CodeSet variant model(s)`, input.inheritParent ? "Show inherited parent fields on each child" : "Reference the source model from each variant");
  } else if (input.patternId === "create-work") {
    const work = addSeed(input.modelName || `${source.title} Work`, source.fields, "work");
    for (const original of context.relationships.filter((item) => item.sourceId === source.id || item.targetId === source.id)) {
      const rel = { ...original, id: idFactory(), sourceId: original.sourceId === source.id ? work.id : original.sourceId, targetId: original.targetId === source.id ? work.id : original.targetId };
      addRelationship(rel, [work.id]);
    }
    summary.push(`Create work model ${work.title}`, "Copy related links and hide them on the work model");
  } else if (input.patternId === "create-history") {
    const sourceKeys = source.fields.filter((field) => field.primaryKey).map(cloneField);
    const temporalNames = input.temporalNames.filter(Boolean);
    const temporal = temporalNames.map((name, index) => ({ id: idFactory(), name, primaryKey: input.temporalMode !== "range" || index === temporalNames.length - 1, important: true }));
    const history = addSeed(input.modelName || `${source.title} History`, [...sourceKeys, ...selected.map(cloneField), ...temporal], "history");
    history.dependency = "dependent";
    if (input.historyStorage !== "source") removeSelected();
    if (input.historyStorage === "current") addSeed(input.currentModelName || `${source.title} Current`, selected).dependency = "dependent";
    addRelationship(relationship(idFactory(), "history", history.id, source.id, "0..*", "1", input.historyStorage === "source" ? "label" : "foreign-key"));
    if (input.historyStorage === "source") copySelectedRelationships(history.id, true); else moveSelectedRelationships(history.id);
    summary.push(`Create history model ${history.title}`, input.temporalMode === "range" ? "Use the range end as the temporal key" : `Use ${input.temporalMode} as the temporal key`);
  } else {
    const keys = configuredKeys();
    const moved = selected.map((field) => ({ ...cloneField(field), primaryKey: keys.some((key) => key.id === field.id) || field.primaryKey }));
    const target = addSeed(input.modelName, [...moved, ...keys.filter((key) => !moved.some((field) => field.id === key.id))]);
    if (["multiple-items", "extract-optional", "extract-one-to-one"].includes(input.patternId)) target.dependency = "dependent";
    if (input.ordered) target.fields.push({ id: idFactory(), name: input.orderFieldName || "position", primaryKey: false, important: false });
    if (input.patternId !== "extract-master" || !input.keepSnapshot) removeSelected();
    if (input.patternId === "extract-master") { target.role = "master"; target.dependency = "independent"; addRelationship(relationship(idFactory(), "references", source.id, target.id, "0..*", "1")); }
    if (input.patternId === "multiple-items") addRelationship(relationship(idFactory(), "contains", source.id, target.id, input.cardinality === "N:M" ? "0..*" : "1", "0..*"));
    if (input.patternId === "extract-optional") addRelationship(relationship(idFactory(), "optional", source.id, target.id, "1", "0..1"));
    if (input.patternId === "extract-one-to-one") addRelationship(relationship(idFactory(), "details", source.id, target.id, "1", "1"));
    if (input.patternId === "extract-master" && input.keepSnapshot) {
      copySelectedRelationships(target.id);
      for (const relationshipId of selectedRelationshipIds) {
        const reference = references.find((item) => item.relationshipId === relationshipId);
        if (reference && !reference.hiddenOnModelIds.includes(source.id)) reference.hiddenOnModelIds.push(source.id);
      }
    } else moveSelectedRelationships(target.id);
    summary.push(`Create model ${target.title}`, `Move ${selected.length} selected field(s)`, `Connect ${source.title} to ${target.title}`);
  }
  const affectedSeedIds = seeds.filter((seed) => context.seeds.some((current) => current.id === seed.id && JSON.stringify(current) !== JSON.stringify(seed))).map((seed) => seed.id);
  return { seeds, relationships, relationshipReferences: references, domains, affectedSeedIds, createdSeedIds, summary };
}
