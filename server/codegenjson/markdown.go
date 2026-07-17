package codegenjson

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"unicode"
)

const markdownExportFormatVersion = 3

// GenerateMarkdown builds the human-readable Markdown inventory files that the
// browser or native adapter can package into a ZIP archive.
func GenerateMarkdown(input []byte, options MarkdownOptions) (ExportResult, error) {
	projectID, state, err := decodeProject(input)
	if err != nil {
		return ExportResult{}, err
	}
	options = normalizeMarkdownOptions(options)
	artifacts := make([]ExportArtifact, 0, len(state.Seeds)+len(state.Canvases)+len(state.DFD.Canvases)+10)
	diagrams, diagramLinks := svgArtifacts(state, options)
	artifacts = append(artifacts, diagrams...)

	tablePaths := make(map[string]string, len(state.Seeds))
	usedTablePaths := make(map[string]bool, len(state.Seeds))
	models := sortedModels(state.Seeds)
	for _, model := range models {
		base := safePathToken(model.ID)
		path := "tables/" + base + ".md"
		if usedTablePaths[path] {
			path = "tables/" + base + "-" + stableTokenHash(model.ID) + ".md"
		}
		usedTablePaths[path] = true
		tablePaths[model.ID] = path
	}
	for _, model := range models {
		path := tablePaths[model.ID]
		artifacts = append(artifacts, markdownArtifact(path, renderTableMarkdown(model, state, options, tablePaths)))
	}
	for _, diagram := range diagramLinks {
		if diagram.Kind == "ERD" || diagram.Kind == "DFD" {
			artifacts = append(artifacts, markdownArtifact(diagramPagePath(diagram), renderDiagramMarkdown(diagram, state, options, tablePaths)))
		}
	}
	artifacts = append(artifacts,
		markdownArtifact("index.md", renderIndexMarkdown(projectID, state, options, tablePaths, diagramLinks)),
		markdownArtifact("vocabulary.md", renderVocabularyMarkdown(state.VocabularyEntries)),
		markdownArtifact("domains.md", renderDomainsMarkdown(state.Domains, options.NameMode)),
		markdownArtifact("relationships.md", renderRelationshipsMarkdown(state, options.NameMode, tablePaths)),
		markdownArtifact("dfd-processes-and-flows.md", renderDFDMarkdown(state, options.NameMode, tablePaths)),
		markdownArtifact("crud-assignments.md", renderCRUDMarkdown(state, options.NameMode, tablePaths)),
	)
	sort.Slice(artifacts, func(i, j int) bool { return artifacts[i].Path < artifacts[j].Path })
	paths := make([]string, 0, len(artifacts)+1)
	for _, artifact := range artifacts {
		paths = append(paths, artifact.Path)
	}
	paths = append(paths, "manifest.json")
	artifacts = append(artifacts, ExportArtifact{
		Path:      "manifest.json",
		MediaType: "application/json",
		Content:   renderManifest(projectID, options, paths),
	})
	return ExportResult{Artifacts: artifacts, Diagnostics: []ExportDiagnostic{}}, nil
}

func normalizeMarkdownOptions(options MarkdownOptions) MarkdownOptions {
	switch options.NameMode {
	case "business", "system", "physical":
	default:
		options.NameMode = "business"
	}
	switch options.ModelCardContent {
	case "description", "primary_keys":
	default:
		options.ModelCardContent = "primary_keys"
	}
	return options
}

func markdownArtifact(path, content string) ExportArtifact {
	return ExportArtifact{Path: path, MediaType: "text/markdown; charset=utf-8", Content: content}
}

func renderIndexMarkdown(projectID string, state ProjectState, options MarkdownOptions, tablePaths map[string]string, diagrams []diagramLink) string {
	var out strings.Builder
	out.WriteString("# Project documentation\n\n")
	writeNavigation(&out, "")
	out.WriteByte('\n')
	writeDefinition(&out, "Project ID", projectID)
	writeDefinition(&out, "Name mode", options.NameMode)
	writeDefinition(&out, "Model card content", options.ModelCardContent)
	out.WriteString("\n## Diagrams\n\n")
	if len(diagrams) == 0 {
		out.WriteString("_No diagrams._\n")
	} else {
		for _, diagram := range diagrams {
			target := diagramPagePath(diagram)
			if diagram.Kind == "CRUD" {
				target = "crud-assignments.md"
			}
			fmt.Fprintf(&out, "- **%s:** [%s](%s)\n", markdownInline(diagram.Kind), markdownInline(diagram.Name), target)
		}
	}
	out.WriteString("\n## Tables\n\n")
	models := sortedModels(state.Seeds)
	if len(models) == 0 {
		out.WriteString("_No tables._\n")
	} else {
		for _, model := range models {
			fmt.Fprintf(&out, "- [%s](%s)", markdownInline(displayName(model.Title, model.Names, options.NameMode)), tablePaths[model.ID])
			if options.ModelCardContent == "description" {
				fmt.Fprintf(&out, " — %s", markdownInline(emptyLabel(model.Description)))
			} else {
				keys := make([]string, 0)
				for _, field := range model.Fields {
					if field.PrimaryKey {
						keys = append(keys, displayName(field.Name, field.Names, options.NameMode))
					}
				}
				fmt.Fprintf(&out, " — Primary keys: %s", markdownInline(emptyLabel(strings.Join(keys, ", "))))
			}
			out.WriteByte('\n')
		}
	}
	out.WriteString("\n## Inventories\n\n")
	out.WriteString("- [Vocabulary](vocabulary.md)\n- [Domains](domains.md)\n- [Relationships](relationships.md)\n- [DFD processes and flows](dfd-processes-and-flows.md)\n- [CRUD assignments](crud-assignments.md)\n")
	return out.String()
}

func diagramPagePath(diagram diagramLink) string {
	return strings.TrimSuffix(diagram.Path, ".svg") + ".md"
}

func diagramFileName(path string) string {
	if index := strings.LastIndexByte(path, '/'); index >= 0 {
		return path[index+1:]
	}
	return path
}

func renderDiagramMarkdown(diagram diagramLink, state ProjectState, options MarkdownOptions, tablePaths map[string]string) string {
	var out strings.Builder
	fmt.Fprintf(&out, "# %s: %s\n\n", markdownHeading(diagram.Kind), markdownHeading(diagram.Name))
	writeNavigation(&out, "../../")
	fmt.Fprintf(&out, "\n![%s: %s](%s)\n\n", markdownInline(diagram.Kind), markdownInline(diagram.Name), diagramFileName(diagram.Path))
	fmt.Fprintf(&out, "[Open SVG](%s)\n", diagramFileName(diagram.Path))

	models := diagramModels(diagram, state, options)
	out.WriteString("\n## Tables used in this diagram\n\n")
	if len(models) == 0 {
		out.WriteString("_No tables._\n")
	} else {
		out.WriteString("| Table | Role | Tags | Note |\n| --- | --- | --- | --- |\n")
		for _, model := range models {
			fmt.Fprintf(&out, "| [%s](../../%s) | %s | %s | %s |\n",
				markdownCell(displayName(model.Title, model.Names, options.NameMode)), tablePaths[model.ID], markdownCell(model.Role), markdownCell(strings.Join(modelTags(model), ", ")), markdownCell(emptyLabel(model.Description)))
		}
	}

	if diagram.Kind == "ERD" {
		renderERDDiagramDetails(&out, diagram, state, options, tablePaths, models)
	} else {
		renderDFDDiagramDetails(&out, diagram, state, options)
	}
	return out.String()
}

func diagramModels(diagram diagramLink, state ProjectState, options MarkdownOptions) []SourceModel {
	byID := modelsByID(state.Seeds)
	selected := make(map[string]SourceModel)
	if diagram.Kind == "ERD" {
		for _, item := range placedModels(diagram.CanvasID, state, options) {
			selected[item.model.ID] = item.model
		}
	} else {
		for _, node := range state.DFD.Nodes {
			if node.CanvasID == diagram.CanvasID && node.Kind == "model" {
				if model, ok := byID[node.ModelID]; ok {
					selected[model.ID] = model
				}
			}
		}
	}
	result := make([]SourceModel, 0, len(selected))
	for _, model := range selected {
		result = append(result, model)
	}
	return sortedModels(result)
}

func renderERDDiagramDetails(out *strings.Builder, diagram diagramLink, state ProjectState, options MarkdownOptions, tablePaths map[string]string, models []SourceModel) {
	visible := make(map[string]bool, len(models))
	for _, model := range models {
		visible[model.ID] = true
	}
	out.WriteString("\n## Relationships in this diagram\n\n")
	relationships := append([]SourceRelationship(nil), state.Relationships...)
	sort.Slice(relationships, func(i, j int) bool { return relationships[i].ID < relationships[j].ID })
	count := 0
	modelMap := modelsByID(state.Seeds)
	for _, relationship := range relationships {
		if !visible[relationship.SourceID] || !visible[relationship.TargetID] {
			continue
		}
		count++
		source, target := modelMap[relationship.SourceID], modelMap[relationship.TargetID]
		fmt.Fprintf(out, "- **%s** (%s): [%s](../../%s) %s → %s [%s](../../%s)\n",
			markdownInline(relationship.Name), markdownInline(relationship.Kind), markdownInline(displayName(source.Title, source.Names, options.NameMode)), tablePaths[source.ID], markdownInline(relationship.SourceMultiplicity), markdownInline(relationship.TargetMultiplicity), markdownInline(displayName(target.Title, target.Names, options.NameMode)), tablePaths[target.ID])
	}
	if count == 0 {
		out.WriteString("_No relationships._\n")
	}
}

func renderDFDDiagramDetails(out *strings.Builder, diagram diagramLink, state ProjectState, options MarkdownOptions) {
	nodes := make([]SourceDFDNode, 0)
	for _, node := range state.DFD.Nodes {
		if node.CanvasID == diagram.CanvasID {
			nodes = append(nodes, node)
		}
	}
	sort.Slice(nodes, func(i, j int) bool { return nodes[i].ID < nodes[j].ID })
	out.WriteString("\n## Processes\n\n| Process | Kind | Description | Physical processes |\n| --- | --- | --- | --- |\n")
	processCount := 0
	for _, node := range nodes {
		if node.Kind != "process" {
			continue
		}
		processCount++
		physical := make([]string, 0, len(node.PhysicalProcesses))
		for _, process := range node.PhysicalProcesses {
			physical = append(physical, process.Name)
		}
		fmt.Fprintf(out, "| %s | %s | %s | %s |\n", markdownCell(node.Name), markdownCell(node.ProcessKind), markdownCell(emptyLabel(node.Description)), markdownCell(emptyLabel(strings.Join(physical, ", "))))
	}
	if processCount == 0 {
		out.WriteString("| _No processes_ |  |  |  |\n")
	}

	out.WriteString("\n## Data flows\n\n| Flow | Source | Destination | Protocol | Bidirectional |\n| --- | --- | --- | --- | --- |\n")
	nodeNames := dfdNodeNames(state, options.NameMode)
	flows := append([]SourceDFDFlow(nil), state.DFD.Flows...)
	sort.Slice(flows, func(i, j int) bool { return flows[i].ID < flows[j].ID })
	flowCount := 0
	for _, flow := range flows {
		if flow.CanvasID != diagram.CanvasID {
			continue
		}
		flowCount++
		fmt.Fprintf(out, "| %s | %s | %s | %s | %s |\n", markdownCell(emptyLabel(flow.Label)), markdownCell(nodeNames[flow.SourceID]), markdownCell(nodeNames[flow.DestinationID]), markdownCell(emptyLabel(flow.Protocol)), yesNo(flow.Bidirectional))
	}
	if flowCount == 0 {
		out.WriteString("| _No data flows_ |  |  |  |  |\n")
	}
}

func renderTableMarkdown(model SourceModel, state ProjectState, options MarkdownOptions, tablePaths map[string]string) string {
	domains := make(map[string]SourceDomain, len(state.Domains))
	for _, domain := range state.Domains {
		domains[domain.ID] = domain
	}
	name := displayName(model.Title, model.Names, options.NameMode)
	var out strings.Builder
	fmt.Fprintf(&out, "# %s\n\n", markdownHeading(name))
	writeNavigation(&out, "../")
	out.WriteByte('\n')
	writeNameSet(&out, model.Names, model.Title)
	writeDefinition(&out, "Role", model.Role)
	writeDefinition(&out, "Tags", strings.Join(modelTags(model), ", "))
	writeDefinition(&out, "Model stage", modelStageLabel(model.MaturedLevel))
	writeDefinition(&out, "Maturity level", formatNumber(model.MaturedLevel))
	writeDefinition(&out, "Usage scope", emptyLabel(model.UsageScope))
	out.WriteString("\n## Note\n\n")
	out.WriteString(markdownParagraph(model.Description))
	out.WriteByte('\n')
	out.WriteString("\n## Columns\n\n")
	out.WriteString("| Name | Business | System | Physical | Domain | PK | Important | Required | Unique | Default | Generation | Avg bytes |\n")
	out.WriteString("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---: |\n")
	if len(model.Fields) == 0 {
		out.WriteString("| _No columns_ |  |  |  |  |  |  |  |  |  |  |  |\n")
	} else {
		for _, field := range model.Fields {
			fieldNames := rawNames(field.Name, field.Names)
			domain := domains[field.DomainID]
			domainName := "Unassigned"
			if domain.ID != "" {
				domainName = displayName(domain.Name, domain.Names, options.NameMode)
			}
			domainLabel := markdownCell(domainName)
			if domain.ID != "" {
				domainLabel = fmt.Sprintf("[%s](../domains.md#%s)", markdownCell(domainName), markdownAnchor("domain-"+domain.ID))
			}
			fmt.Fprintf(&out, "| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |\n",
				markdownCell(displayName(field.Name, field.Names, options.NameMode)), markdownCell(fieldNames.Business), markdownCell(fieldNames.System), markdownCell(fieldNames.Physical),
				domainLabel, yesNo(field.PrimaryKey), yesNo(field.Important), yesNo(field.Required || field.PrimaryKey), yesNo(field.Unique), markdownCell(formatDefault(field.DefaultValue)), markdownCell(emptyLabel(field.ValueGeneration)), optionalNumber(field.EstimatedAverageSizeBytes))
		}
	}
	renderModelStorageMarkdown(&out, model)
	out.WriteString("\n## Relationships\n\n")
	related := make([]SourceRelationship, 0)
	for _, relationship := range state.Relationships {
		if relationship.SourceID == model.ID || relationship.TargetID == model.ID {
			related = append(related, relationship)
		}
	}
	sort.Slice(related, func(i, j int) bool { return related[i].ID < related[j].ID })
	if len(related) == 0 {
		out.WriteString("_No relationships._\n")
	} else {
		models := modelsByID(state.Seeds)
		for _, relationship := range related {
			otherID := relationship.SourceID
			if otherID == model.ID {
				otherID = relationship.TargetID
			}
			other := models[otherID]
			fmt.Fprintf(&out, "- **%s** (%s) → [%s](../%s)\n", markdownInline(relationship.Name), markdownInline(relationship.Kind), markdownInline(displayName(other.Title, other.Names, options.NameMode)), tablePaths[other.ID])
		}
	}
	if strings.TrimSpace(model.AdditionalSQL) != "" {
		out.WriteString("\n## Additional SQL\n\n```sql\n")
		out.WriteString(model.AdditionalSQL)
		if !strings.HasSuffix(model.AdditionalSQL, "\n") {
			out.WriteByte('\n')
		}
		out.WriteString("```\n")
	}
	return out.String()
}

func renderVocabularyMarkdown(entries []SourceVocabularyEntry) string {
	var out strings.Builder
	out.WriteString("# Vocabulary\n\n")
	writeNavigation(&out, "")
	out.WriteString("\n| Business | System | Physical | Meaning | Memo | Aliases |\n| --- | --- | --- | --- | --- | --- |\n")
	entries = append([]SourceVocabularyEntry(nil), entries...)
	sort.Slice(entries, func(i, j int) bool { return entries[i].ID < entries[j].ID })
	if len(entries) == 0 {
		out.WriteString("| _No vocabulary entries_ |  |  |  |  |  |\n")
	}
	for _, entry := range entries {
		aliases := append([]string(nil), entry.Aliases...)
		sort.Strings(aliases)
		fmt.Fprintf(&out, "| %s | %s | %s | %s | %s | %s |\n", markdownCell(entry.BusinessName), markdownCell(entry.SystemName), markdownCell(entry.PhysicalName), markdownCell(entry.Meaning), markdownCell(entry.Memo), markdownCell(strings.Join(aliases, ", ")))
	}
	return out.String()
}

func renderDomainsMarkdown(domains []SourceDomain, mode string) string {
	var out strings.Builder
	out.WriteString("# Domains\n\n")
	writeNavigation(&out, "")
	out.WriteString("\n| Name | Shape | Physical type | Components | Codes |\n| --- | --- | --- | --- | --- |\n")
	domains = append([]SourceDomain(nil), domains...)
	sort.Slice(domains, func(i, j int) bool { return domains[i].ID < domains[j].ID })
	if len(domains) == 0 {
		out.WriteString("| _No domains_ |  |  |  |  |\n")
	}
	for _, domain := range domains {
		components := make([]string, 0, len(domain.Components))
		for _, component := range domain.Components {
			components = append(components, fmt.Sprintf("%s → [%s](#%s)", markdownInline(component.Name), markdownInline(component.DomainID), markdownAnchor("domain-"+component.DomainID)))
		}
		codes := make([]string, 0, len(domain.CodeSetEntries))
		for _, entry := range domain.CodeSetEntries {
			codes = append(codes, entry.Value+" = "+entry.Name)
		}
		name := fmt.Sprintf("<a id=\"%s\"></a>%s", markdownAnchor("domain-"+domain.ID), markdownCell(displayName(domain.Name, domain.Names, mode)))
		fmt.Fprintf(&out, "| %s | %s | %s | %s | %s |\n", name, markdownCell(domain.Shape), markdownCell(domainTypeDescription(domain)), strings.Join(components, "; "), markdownCell(strings.Join(codes, "; ")))
	}
	return out.String()
}

func renderRelationshipsMarkdown(state ProjectState, mode string, tablePaths map[string]string) string {
	var out strings.Builder
	out.WriteString("# Relationships\n\n")
	writeNavigation(&out, "")
	out.WriteString("\n| Name | Kind | Source | Target | Multiplicity | Direction | On delete | PK | FK |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n")
	models := modelsByID(state.Seeds)
	references := referencesByRelationshipID(state.RelationshipReferences)
	relationships := append([]SourceRelationship(nil), state.Relationships...)
	sort.Slice(relationships, func(i, j int) bool { return relationships[i].ID < relationships[j].ID })
	if len(relationships) == 0 {
		out.WriteString("| _No relationships_ |  |  |  |  |  |  |  |  |\n")
	}
	for _, relationship := range relationships {
		reference := references[relationship.ID]
		source, target := models[relationship.SourceID], models[relationship.TargetID]
		fmt.Fprintf(&out, "| %s | %s | [%s](%s) | [%s](%s) | %s → %s | %s | %s | %s | %s |\n", markdownCell(relationship.Name), markdownCell(relationship.Kind), markdownCell(displayName(source.Title, source.Names, mode)), tablePaths[source.ID], markdownCell(displayName(target.Title, target.Names, mode)), tablePaths[target.ID], markdownCell(relationship.SourceMultiplicity), markdownCell(relationship.TargetMultiplicity), markdownCell(relationship.Direction), markdownCell(emptyLabel(relationship.OnDelete)), yesNo(reference.PrimaryKey), yesNo(reference.ForeignKey))
	}
	return out.String()
}

func renderDFDMarkdown(state ProjectState, mode string, tablePaths map[string]string) string {
	var out strings.Builder
	out.WriteString("# DFD processes and flows\n\n")
	writeNavigation(&out, "")
	out.WriteString("\n## Processes\n\n| Name | Kind | Canvas | Description | Physical processes |\n| --- | --- | --- | --- | --- |\n")
	nodes := append([]SourceDFDNode(nil), state.DFD.Nodes...)
	sort.Slice(nodes, func(i, j int) bool { return nodes[i].ID < nodes[j].ID })
	processCount := 0
	for _, node := range nodes {
		if node.Kind != "process" {
			continue
		}
		processCount++
		physical := make([]string, 0, len(node.PhysicalProcesses))
		for _, process := range node.PhysicalProcesses {
			physical = append(physical, process.Name)
		}
		fmt.Fprintf(&out, "| %s | %s | %s | %s | %s |\n", markdownCell(node.Name), markdownCell(node.ProcessKind), markdownCell(node.CanvasID), markdownCell(node.Description), markdownCell(strings.Join(physical, ", ")))
	}
	if processCount == 0 {
		out.WriteString("| _No processes_ |  |  |  |  |\n")
	}
	out.WriteString("\n## Data flows\n\n| Label | Canvas | Source | Destination | Protocol | Bidirectional |\n| --- | --- | --- | --- | --- | --- |\n")
	nodeNames := dfdNodeNames(state, mode)
	flows := append([]SourceDFDFlow(nil), state.DFD.Flows...)
	sort.Slice(flows, func(i, j int) bool { return flows[i].ID < flows[j].ID })
	if len(flows) == 0 {
		out.WriteString("| _No data flows_ |  |  |  |  |  |\n")
	}
	for _, flow := range flows {
		fmt.Fprintf(&out, "| %s | %s | %s | %s | %s | %s |\n", markdownCell(emptyLabel(flow.Label)), markdownCell(flow.CanvasID), markdownCell(nodeNames[flow.SourceID]), markdownCell(nodeNames[flow.DestinationID]), markdownCell(emptyLabel(flow.Protocol)), yesNo(flow.Bidirectional))
	}
	out.WriteString("\n## Data models on DFDs\n\n")
	modelNodes := 0
	models := modelsByID(state.Seeds)
	for _, node := range nodes {
		model := models[node.ModelID]
		if node.Kind != "model" || model.ID == "" {
			continue
		}
		modelNodes++
		fmt.Fprintf(&out, "- [%s](%s) — canvas `%s`\n", markdownInline(displayName(model.Title, model.Names, mode)), tablePaths[model.ID], markdownInline(node.CanvasID))
	}
	if modelNodes == 0 {
		out.WriteString("_No data models._\n")
	}
	return out.String()
}

func renderCRUDMarkdown(state ProjectState, mode string, tablePaths map[string]string) string {
	var out strings.Builder
	out.WriteString("# CRUD assignments\n\n")
	writeNavigation(&out, "")
	out.WriteString("\n## Matrix\n\n![CRUD matrix](diagrams/crud-matrix.svg)\n\n[Open SVG](diagrams/crud-matrix.svg)\n")
	out.WriteString("\n## Assignments\n\n| Flow | Process | Model | Operations |\n| --- | --- | --- | --- |\n")
	models := modelsByID(state.Seeds)
	flows := append([]SourceDFDFlow(nil), state.DFD.Flows...)
	sort.Slice(flows, func(i, j int) bool { return flows[i].ID < flows[j].ID })
	count := 0
	for _, flow := range flows {
		assignments := append([]SourceCRUDAssignment(nil), flow.CRUDAssignments...)
		sort.Slice(assignments, func(i, j int) bool {
			if assignments[i].ProcessUnitID != assignments[j].ProcessUnitID {
				return assignments[i].ProcessUnitID < assignments[j].ProcessUnitID
			}
			return assignments[i].ModelID < assignments[j].ModelID
		})
		for _, assignment := range assignments {
			count++
			operations := append([]string(nil), assignment.Operations...)
			sort.Strings(operations)
			model := models[assignment.ModelID]
			fmt.Fprintf(&out, "| %s | %s | [%s](%s) | %s |\n", markdownCell(flow.Label), markdownCell(assignment.ProcessUnitID), markdownCell(displayName(model.Title, model.Names, mode)), tablePaths[model.ID], markdownCell(strings.Join(operations, ", ")))
		}
	}
	if count == 0 {
		out.WriteString("| _No CRUD assignments_ |  |  |  |\n")
	}
	return out.String()
}

func writeNavigation(out *strings.Builder, prefix string) {
	fmt.Fprintf(out, "[Index](%sindex.md) · [Vocabulary](%svocabulary.md) · [Domains](%sdomains.md) · [Relationships](%srelationships.md) · [DFD](%sdfd-processes-and-flows.md) · [CRUD](%scrud-assignments.md)\n", prefix, prefix, prefix, prefix, prefix, prefix)
}

func modelTags(model SourceModel) []string {
	tags := make([]string, 0, 3)
	for _, tag := range []string{model.Dependency, model.Role} {
		if strings.TrimSpace(tag) != "" {
			tags = append(tags, tag)
		}
	}
	if model.HasPrivacy {
		tags = append(tags, "privacy")
	}
	if len(tags) == 0 {
		return []string{"—"}
	}
	return tags
}

func modelStageLabel(level float64) string {
	switch {
	case level <= 0.5:
		return "Matured model"
	case level <= 1.25:
		return "Logical model"
	case level <= 3.5:
		return "Conceptual model"
	default:
		return "Model seed"
	}
}

func renderModelStorageMarkdown(out *strings.Builder, model SourceModel) {
	out.WriteString("\n## Storage design\n\n")
	if len(model.Indexes) == 0 {
		out.WriteString("### Indexes\n\n_No indexes._\n")
	} else {
		fields := make(map[string]string, len(model.Fields))
		for _, field := range model.Fields {
			fields[field.ID] = field.Name
		}
		out.WriteString("### Indexes\n\n")
		for _, index := range model.Indexes {
			keys := make([]string, 0, len(index.Keys))
			for _, key := range index.Keys {
				name := fields[key.SourceID]
				if name == "" {
					name = key.SourceID
				}
				if key.ComponentID != "" {
					name += "." + key.ComponentID
				}
				keys = append(keys, name+" ("+key.Direction+")")
			}
			kind := "index"
			if index.Unique {
				kind = "unique index"
			}
			fmt.Fprintf(out, "- **%s** — %s: %s\n", markdownInline(emptyLabel(index.Name)), kind, markdownInline(strings.Join(keys, ", ")))
		}
	}

	out.WriteString("\n### Partitioning\n\n")
	if model.Partitioning.Strategy == "" {
		out.WriteString("_No partitioning._\n")
	} else {
		writeDefinition(out, "Strategy", model.Partitioning.Strategy)
		writeDefinition(out, "Keys", partitionKeys(model.Partitioning.Keys, model.Fields))
		if len(model.Partitioning.Ranges) > 0 {
			out.WriteString("\n| Range | From | To |\n| --- | --- | --- |\n")
			for _, item := range model.Partitioning.Ranges {
				fmt.Fprintf(out, "| %s | %s | %s |\n", markdownCell(item.Name), markdownCell(partitionBounds(item.From)), markdownCell(partitionBounds(item.To)))
			}
		}
	}

	out.WriteString("\n### Volume estimate\n\n")
	volume := model.VolumeEstimate
	if volume.InitialRecordCount == 0 && volume.GrowthRate.Amount == 0 && volume.MaximumRecordCount == 0 && volume.RetentionPeriod.Value == 0 {
		out.WriteString("_No volume estimate._\n")
	} else {
		writeDefinition(out, "Initial records", strconv.Itoa(volume.InitialRecordCount))
		writeDefinition(out, "Growth", fmt.Sprintf("%d per %s", volume.GrowthRate.Amount, emptyLabel(volume.GrowthRate.Period)))
		if volume.RetentionPeriod.Value > 0 {
			writeDefinition(out, "Retention", fmt.Sprintf("%d %s", volume.RetentionPeriod.Value, emptyLabel(volume.RetentionPeriod.Unit)))
		}
		if volume.MaximumRecordCount > 0 {
			writeDefinition(out, "Maximum records", strconv.Itoa(volume.MaximumRecordCount))
		}
	}
}

func partitionKeys(keys []SourcePartitionKey, fields []SourceField) string {
	fieldNames := make(map[string]string, len(fields))
	for _, field := range fields {
		fieldNames[field.ID] = field.Name
	}
	values := make([]string, 0, len(keys))
	for _, key := range keys {
		name := fieldNames[key.FieldID]
		if name == "" {
			name = key.FieldID
		}
		if key.ComponentID != "" {
			name += "." + key.ComponentID
		}
		values = append(values, name)
	}
	return emptyLabel(strings.Join(values, ", "))
}

func partitionBounds(bounds []SourcePartitionBound) string {
	values := make([]string, 0, len(bounds))
	for _, bound := range bounds {
		if bound.Kind == "literal" {
			values = append(values, bound.Value)
		} else {
			values = append(values, bound.Kind)
		}
	}
	return emptyLabel(strings.Join(values, ", "))
}

func renderManifest(projectID string, options MarkdownOptions, paths []string) string {
	var out strings.Builder
	out.WriteString("{\n  \"exportFormatVersion\": ")
	out.WriteString(strconv.Itoa(markdownExportFormatVersion))
	out.WriteString(",\n  \"projectId\": ")
	out.WriteString(strconv.Quote(projectID))
	out.WriteString(",\n  \"generatedAt\": ")
	out.WriteString(strconv.Quote(options.GeneratedAt))
	out.WriteString(",\n  \"sourceSnapshotRevision\": ")
	out.WriteString(strconv.Quote(options.SourceSnapshotRevision))
	out.WriteString(",\n  \"filePaths\": [")
	for index, path := range paths {
		if index > 0 {
			out.WriteString(", ")
		}
		out.WriteString(strconv.Quote(path))
	}
	out.WriteString("]\n}\n")
	return out.String()
}

func sortedModels(models []SourceModel) []SourceModel {
	result := append([]SourceModel(nil), models...)
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func modelsByID(models []SourceModel) map[string]SourceModel {
	result := make(map[string]SourceModel, len(models))
	for _, model := range models {
		result[model.ID] = model
	}
	return result
}

func referencesByRelationshipID(references []SourceRelationshipReference) map[string]SourceRelationshipReference {
	result := make(map[string]SourceRelationshipReference, len(references))
	for _, reference := range references {
		result[reference.RelationshipID] = reference
	}
	return result
}

func dfdNodeNames(state ProjectState, mode string) map[string]string {
	models := modelsByID(state.Seeds)
	result := make(map[string]string, len(state.DFD.Nodes))
	for _, node := range state.DFD.Nodes {
		name := node.Name
		if model := models[node.ModelID]; model.ID != "" {
			name = displayName(model.Title, model.Names, mode)
		}
		result[node.ID] = name
	}
	return result
}

func displayName(fallback string, names Names, mode string) string {
	var value string
	switch mode {
	case "system":
		value = names.System
	case "physical":
		value = names.Physical
	default:
		value = names.Business
	}
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func rawNames(fallback string, names Names) Names {
	if names.Business == "" && names.System == "" && names.Physical == "" {
		names.Business = fallback
	}
	return names
}

func writeNameSet(out *strings.Builder, names Names, fallback string) {
	names = rawNames(fallback, names)
	writeDefinition(out, "Business name", emptyLabel(names.Business))
	writeDefinition(out, "System name", emptyLabel(names.System))
	writeDefinition(out, "Physical name", emptyLabel(names.Physical))
}

func writeDefinition(out *strings.Builder, label, value string) {
	fmt.Fprintf(out, "- **%s:** %s\n", markdownInline(label), markdownInline(value))
}

func domainTypeDescription(domain SourceDomain) string {
	switch domain.PrimitiveType {
	case "integer", "floating_point":
		if domain.Bits > 0 {
			return fmt.Sprintf("%s(%d bit)", domain.PrimitiveType, domain.Bits)
		}
	case "varchar":
		if domain.Length > 0 {
			return fmt.Sprintf("varchar(%d)", domain.Length)
		}
	case "decimal":
		if domain.Precision > 0 {
			return fmt.Sprintf("decimal(%d,%d)", domain.Precision, domain.Scale)
		}
	case "code_set":
		return "code_set(" + domain.CodeSetBaseType + ")"
	}
	return emptyLabel(domain.PrimitiveType)
}

func formatDefault(value SourceColumnDefault) string {
	if value.Kind == "" || value.Kind == "none" {
		return "—"
	}
	if value.Kind == "literal" {
		return value.Value
	}
	return value.Kind
}

func yesNo(value bool) string {
	if value {
		return "Yes"
	}
	return "No"
}

func emptyLabel(value string) string {
	if strings.TrimSpace(value) == "" {
		return "—"
	}
	return value
}

func markdownHeading(value string) string {
	value = strings.ReplaceAll(value, "\r", " ")
	value = strings.ReplaceAll(value, "\n", " ")
	return strings.TrimSpace(value)
}

func markdownInline(value string) string {
	value = markdownHeading(value)
	value = strings.ReplaceAll(value, "\\", "\\\\")
	for _, token := range []string{"`", "*", "_", "[", "]", "<", ">"} {
		value = strings.ReplaceAll(value, token, "\\"+token)
	}
	return value
}

func markdownCell(value string) string {
	value = strings.ReplaceAll(value, "\r\n", "<br>")
	value = strings.ReplaceAll(value, "\n", "<br>")
	value = strings.ReplaceAll(value, "\r", "<br>")
	value = strings.ReplaceAll(value, "|", "\\|")
	return strings.TrimSpace(value)
}

func markdownParagraph(value string) string {
	value = strings.ReplaceAll(value, "\r\n", "\n")
	value = strings.ReplaceAll(value, "\r", "\n")
	if strings.TrimSpace(value) == "" {
		return "—\n"
	}
	lines := strings.Split(value, "\n")
	for index, line := range lines {
		lines[index] = markdownInline(line)
	}
	return strings.Join(lines, "  \n") + "\n"
}

func markdownAnchor(value string) string {
	return safePathToken(value)
}

func formatNumber(value float64) string {
	return strconv.FormatFloat(value, 'f', -1, 64)
}

func optionalNumber(value float64) string {
	if value <= 0 {
		return "—"
	}
	return formatNumber(value)
}

func safePathToken(value string) string {
	var out strings.Builder
	for _, current := range strings.ToLower(value) {
		if unicode.IsLetter(current) || unicode.IsDigit(current) || current == '-' || current == '_' {
			out.WriteRune(current)
		} else {
			out.WriteByte('-')
		}
	}
	value = strings.Trim(out.String(), "-._")
	if value == "" || value == "." || value == ".." {
		return "model"
	}
	return value
}

func stableTokenHash(value string) string {
	var hash uint32 = 2166136261
	for _, current := range []byte(value) {
		hash ^= uint32(current)
		hash *= 16777619
	}
	return fmt.Sprintf("%08x", hash)
}
