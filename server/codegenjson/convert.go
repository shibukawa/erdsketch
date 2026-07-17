package codegenjson

import (
	"bytes"
	"errors"
	"fmt"
	"sort"
	"strings"
)

const projectDocumentName = "project.json"

// Convert transforms the UI's JSON bridge envelope into a deterministic,
// UI-independent code-generation JSON document. It is not a persisted project format.
func Convert(input []byte) ([]byte, error) {
	projectID, state, err := decodeProject(input)
	if err != nil {
		return nil, err
	}

	exchange := buildExchange(projectID, state)
	var compact bytes.Buffer
	if err := encodeOutputJSON(&compact, exchange); err != nil {
		return nil, fmt.Errorf("encode code-generation JSON: %w", err)
	}
	return compact.Bytes(), nil
}

func decodeProject(input []byte) (string, ProjectState, error) {
	documents, err := decodeDocumentSet(bytes.NewReader(input))
	if err != nil {
		return "", ProjectState{}, fmt.Errorf("decode project document set: %w", err)
	}
	if documents.FormatVersion != 1 || strings.TrimSpace(documents.ProjectID) == "" {
		return "", ProjectState{}, errors.New("invalid project document set")
	}
	projectJSON, ok := documents.Documents[projectDocumentName]
	if !ok || strings.TrimSpace(projectJSON) == "" {
		return "", ProjectState{}, errors.New("project.json is missing")
	}
	state, err := decodeProjectState(strings.NewReader(projectJSON))
	if err != nil {
		return "", ProjectState{}, fmt.Errorf("decode project.json: %w", err)
	}
	return documents.ProjectID, state, nil
}

func buildExchange(projectID string, state ProjectState) ExchangeDocument {
	domainsByID := make(map[string]SourceDomain, len(state.Domains))
	for _, domain := range state.Domains {
		domainsByID[domain.ID] = domain
	}

	models := make([]ExchangeModel, 0, len(state.Seeds))
	for _, model := range state.Seeds {
		fields := make([]ExchangeField, 0, len(model.Fields))
		columns := make([]ExchangePhysicalColumn, 0, len(model.Fields))
		for _, field := range model.Fields {
			fieldNames := normalizeNames(field.Name, field.Names)
			fields = append(fields, ExchangeField{
				ID:              field.ID,
				Names:           fieldNames,
				PrimaryKey:      field.PrimaryKey,
				Important:       field.Important,
				DomainID:        field.DomainID,
				Required:        field.Required || field.PrimaryKey,
				Unique:          field.Unique,
				DefaultValue:    field.DefaultValue,
				ValueGeneration: field.ValueGeneration,
			})
			columns = append(columns, expandField(field, fieldNames, domainsByID)...)
		}
		sort.Slice(fields, func(i, j int) bool { return fields[i].ID < fields[j].ID })
		sort.Slice(columns, func(i, j int) bool { return columns[i].ID < columns[j].ID })
		models = append(models, ExchangeModel{
			ID:              model.ID,
			Names:           normalizeNames(model.Title, model.Names),
			Description:     model.Description,
			Role:            model.Role,
			UsageScope:      model.UsageScope,
			Fields:          fields,
			PhysicalColumns: columns,
			Indexes:         sortedIndexes(model.Indexes),
			Partitioning:    model.Partitioning,
			AdditionalSQL:   model.AdditionalSQL,
		})
	}
	sort.Slice(models, func(i, j int) bool { return models[i].ID < models[j].ID })

	domains := make([]ExchangeDomain, 0, len(state.Domains))
	for _, domain := range state.Domains {
		domains = append(domains, ExchangeDomain{
			ID:              domain.ID,
			Names:           normalizeNames(domain.Name, domain.Names),
			CategoryID:      domain.CategoryID,
			Shape:           domain.Shape,
			PrimitiveType:   domain.PrimitiveType,
			Bits:            domain.Bits,
			Unsigned:        domain.Unsigned,
			Length:          domain.Length,
			Precision:       domain.Precision,
			Scale:           domain.Scale,
			CodeSetBaseType: domain.CodeSetBaseType,
			CodeSetEntries:  sortedCodeSetEntries(domain.CodeSetEntries),
			Components:      sortedDomainComponents(domain.Components),
			PartitionKey:    domain.PartitionKey,
			System:          domain.System,
		})
	}
	sort.Slice(domains, func(i, j int) bool { return domains[i].ID < domains[j].ID })

	vocabulary := make([]ExchangeVocabularyEntry, 0, len(state.VocabularyEntries))
	for _, entry := range state.VocabularyEntries {
		aliases := append([]string(nil), entry.Aliases...)
		sort.Strings(aliases)
		vocabulary = append(vocabulary, ExchangeVocabularyEntry{
			ID: entry.ID,
			Names: Names{
				Business: entry.BusinessName,
				System:   entry.SystemName,
				Physical: entry.PhysicalName,
			},
			Meaning: entry.Meaning,
			Memo:    entry.Memo,
			Aliases: aliases,
		})
	}
	sort.Slice(vocabulary, func(i, j int) bool { return vocabulary[i].ID < vocabulary[j].ID })

	referencesByRelationship := make(map[string]SourceRelationshipReference, len(state.RelationshipReferences))
	for _, reference := range state.RelationshipReferences {
		referencesByRelationship[reference.RelationshipID] = reference
	}
	relationships := make([]ExchangeRelationship, 0, len(state.Relationships))
	for _, relationship := range state.Relationships {
		reference := referencesByRelationship[relationship.ID]
		item := ExchangeRelationship{
			ID:                 relationship.ID,
			Name:               relationship.Name,
			SourceID:           relationship.SourceID,
			TargetID:           relationship.TargetID,
			SourceMultiplicity: relationship.SourceMultiplicity,
			TargetMultiplicity: relationship.TargetMultiplicity,
			Direction:          relationship.Direction,
			Kind:               relationship.Kind,
			OnDelete:           relationship.OnDelete,
			ReferenceID:        reference.ID,
			PrimaryKey:         reference.PrimaryKey,
			ForeignKey:         reference.ForeignKey,
		}
		if relationship.Kind == "composition" {
			item.OwnerModelID = relationship.SourceID
			item.ChildModelID = relationship.TargetID
			item.OnDelete = "cascade"
		}
		relationships = append(relationships, item)
	}
	sort.Slice(relationships, func(i, j int) bool { return relationships[i].ID < relationships[j].ID })

	processes, flows, assignments := convertDFD(state.DFD)
	return ExchangeDocument{
		Schema:          SchemaID,
		FormatVersion:   1,
		Project:         ExchangeProject{ID: projectID},
		Models:          models,
		Domains:         domains,
		Vocabulary:      vocabulary,
		Relationships:   relationships,
		Processes:       processes,
		DataFlows:       flows,
		CRUDAssignments: assignments,
	}
}

func expandField(field SourceField, fieldNames Names, domains map[string]SourceDomain) []ExchangePhysicalColumn {
	domain, ok := domains[field.DomainID]
	if !ok {
		return []ExchangePhysicalColumn{physicalColumn(field, fieldNames, field.DomainID, "", "", false, field.Required || field.PrimaryKey)}
	}
	base := fieldNames
	if field.UseDomainName {
		base = appendNames(base, normalizeNames(domain.Name, domain.Names))
	}
	if domain.Shape != "composite" || len(domain.Components) == 0 {
		primitive := resolvePrimitive(domain.ID, domains, map[string]bool{})
		return []ExchangePhysicalColumn{physicalColumn(field, base, domain.ID, "", primitive, primitive != "", field.Required || field.PrimaryKey)}
	}

	columns := make([]ExchangePhysicalColumn, 0, len(domain.Components))
	for _, component := range domain.Components {
		componentNames := appendToken(base, component.Name)
		primitive := resolvePrimitive(component.DomainID, domains, map[string]bool{})
		columns = append(columns, physicalColumn(
			field,
			componentNames,
			component.DomainID,
			component.ID,
			primitive,
			primitive != "",
			field.Required || field.PrimaryKey || component.Required,
		))
	}
	return columns
}

func physicalColumn(field SourceField, names Names, domainID, componentID, primitive string, resolved, required bool) ExchangePhysicalColumn {
	suffix := componentID
	if suffix == "" {
		suffix = "scalar"
	}
	return ExchangePhysicalColumn{
		ID:            "field:" + field.ID + ":" + suffix,
		SourceFieldID: field.ID,
		DomainID:      domainID,
		ComponentID:   componentID,
		Names:         names,
		PrimitiveType: primitive,
		Required:      required,
		PrimaryKey:    field.PrimaryKey,
		Unique:        field.Unique,
		Resolved:      resolved,
	}
}

func resolvePrimitive(domainID string, domains map[string]SourceDomain, seen map[string]bool) string {
	if domainID == "" || seen[domainID] {
		return ""
	}
	seen[domainID] = true
	domain, ok := domains[domainID]
	if !ok {
		return ""
	}
	if domain.PrimitiveType != "" {
		return domain.PrimitiveType
	}
	if domain.Shape == "scalar" && len(domain.Components) == 1 {
		return resolvePrimitive(domain.Components[0].DomainID, domains, seen)
	}
	return ""
}

func convertDFD(state SourceDFDState) ([]ExchangeProcess, []ExchangeDataFlow, []ExchangeCRUDAssignment) {
	nodeIDs := make(map[string]string, len(state.Nodes))
	processByID := make(map[string]ExchangeProcess)
	for _, node := range state.Nodes {
		semanticID := node.DefinitionID
		if node.ModelID != "" {
			semanticID = node.ModelID
		}
		if semanticID == "" {
			semanticID = node.ID
		}
		nodeIDs[node.ID] = semanticID
		if node.Kind == "process" {
			processByID[semanticID] = ExchangeProcess{
				ID:                semanticID,
				Name:              node.Name,
				Description:       node.Description,
				Kind:              node.ProcessKind,
				PhysicalProcesses: sortedPhysicalProcesses(node.PhysicalProcesses),
			}
		}
	}
	processes := make([]ExchangeProcess, 0, len(processByID))
	for _, process := range processByID {
		processes = append(processes, process)
	}
	sort.Slice(processes, func(i, j int) bool { return processes[i].ID < processes[j].ID })

	flows := make([]ExchangeDataFlow, 0, len(state.Flows))
	assignments := make([]ExchangeCRUDAssignment, 0)
	for _, flow := range state.Flows {
		sourceID := nodeIDs[flow.SourceID]
		if sourceID == "" {
			sourceID = flow.SourceID
		}
		destinationID := nodeIDs[flow.DestinationID]
		if destinationID == "" {
			destinationID = flow.DestinationID
		}
		flows = append(flows, ExchangeDataFlow{
			ID:            flow.ID,
			CanvasID:      flow.CanvasID,
			SourceID:      sourceID,
			DestinationID: destinationID,
			Label:         flow.Label,
			Protocol:      flow.Protocol,
			Bidirectional: flow.Bidirectional,
		})
		for _, assignment := range flow.CRUDAssignments {
			operations := append([]string(nil), assignment.Operations...)
			sort.Strings(operations)
			assignments = append(assignments, ExchangeCRUDAssignment{
				FlowID:        flow.ID,
				ProcessUnitID: assignment.ProcessUnitID,
				ModelID:       assignment.ModelID,
				Operations:    operations,
			})
		}
	}
	sort.Slice(flows, func(i, j int) bool { return flows[i].ID < flows[j].ID })
	sort.Slice(assignments, func(i, j int) bool {
		if assignments[i].FlowID != assignments[j].FlowID {
			return assignments[i].FlowID < assignments[j].FlowID
		}
		if assignments[i].ProcessUnitID != assignments[j].ProcessUnitID {
			return assignments[i].ProcessUnitID < assignments[j].ProcessUnitID
		}
		return assignments[i].ModelID < assignments[j].ModelID
	})
	return processes, flows, assignments
}

func normalizeNames(fallback string, names Names) Names {
	if names.Business == "" {
		names.Business = fallback
	}
	if names.System == "" {
		names.System = fallback
	}
	if names.Physical == "" {
		names.Physical = fallback
	}
	return names
}

func appendNames(left, right Names) Names {
	return Names{
		Business: left.Business + right.Business,
		System:   left.System + right.System,
		Physical: left.Physical + right.Physical,
	}
}

func appendToken(names Names, token string) Names {
	token = strings.Join(strings.Fields(token), "")
	return Names{
		Business: names.Business + token,
		System:   names.System + token,
		Physical: names.Physical + token,
	}
}

func sortedIndexes(source []SourceIndexDefinition) []SourceIndexDefinition {
	result := append([]SourceIndexDefinition(nil), source...)
	for index := range result {
		result[index].Keys = append([]SourceIndexKey(nil), result[index].Keys...)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func sortedCodeSetEntries(source []SourceCodeSetEntry) []SourceCodeSetEntry {
	result := append([]SourceCodeSetEntry(nil), source...)
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func sortedDomainComponents(source []SourceDomainComponent) []SourceDomainComponent {
	result := append([]SourceDomainComponent(nil), source...)
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func sortedPhysicalProcesses(source []SourceDFDPhysicalProcess) []SourceDFDPhysicalProcess {
	result := append([]SourceDFDPhysicalProcess(nil), source...)
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}
