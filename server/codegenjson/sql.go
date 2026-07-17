package codegenjson

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
)

var supportedSQLDialects = map[string]bool{
	"mysql": true, "postgresql": true, "sqlite": true, "duckdb": true, "bigquery": true,
}

type sqlColumn struct {
	Name                    string
	Domain                  SourceDomain
	Required                bool
	PrimaryKey              bool
	Unique                  bool
	DefaultValue            SourceColumnDefault
	ValueGeneration         string
	SourceFieldID           string
	ComponentID             string
	RelationshipID          string
	RelationshipReferenceID string
}

type sqlForeignKey struct {
	Name             string
	Columns          []string
	ReferencedTable  string
	ReferencedColumn []string
	OnDelete         string
	RelationshipID   string
}

type sqlTable struct {
	Model         SourceModel
	Name          string
	Columns       []sqlColumn
	PrimaryKey    []string
	ForeignKeys   []sqlForeignKey
	Indexes       []SourceIndexDefinition
	AdditionalSQL string
}

// GenerateSQL validates the selected physical projection and returns one DDL
// artifact per requested dialect. Any error diagnostic blocks every artifact.
func GenerateSQL(input []byte, options SQLExportOptions) (ExportResult, error) {
	_, state, err := decodeProject(input)
	if err != nil {
		return ExportResult{}, err
	}
	dialects := normalizedDialects(options.Dialects)
	diagnostics := make([]ExportDiagnostic, 0)
	if len(dialects) == 0 {
		diagnostics = append(diagnostics, diagnostic("error", "sql.dialect.required", "Select at least one SQL dialect.", "export/sql", DiagnosticTarget{Kind: "export"}))
	}
	for _, dialect := range dialects {
		if !supportedSQLDialects[dialect] {
			diagnostics = append(diagnostics, diagnostic("error", "sql.dialect.unsupported", "Unsupported SQL dialect: "+dialect, "export/sql/dialects/"+dialect, DiagnosticTarget{Kind: "export"}))
		}
	}
	selected := selectedModels(state.Seeds, options.ModelIDs, &diagnostics)
	tables := projectSQLTables(state, selected, &diagnostics)
	for _, dialect := range dialects {
		if supportedSQLDialects[dialect] {
			validateDialectProjection(dialect, tables, &diagnostics)
		}
	}
	sortDiagnostics(diagnostics)
	if hasErrorDiagnostics(diagnostics) {
		return ExportResult{Artifacts: []ExportArtifact{}, Diagnostics: diagnostics}, nil
	}
	artifacts := make([]ExportArtifact, 0, len(dialects))
	for _, dialect := range dialects {
		artifacts = append(artifacts, ExportArtifact{
			Path:      dialect + ".sql",
			MediaType: "application/sql; charset=utf-8",
			Content:   renderDDL(dialect, tables),
		})
	}
	return ExportResult{Artifacts: artifacts, Diagnostics: diagnostics}, nil
}

func normalizedDialects(source []string) []string {
	seen := make(map[string]bool, len(source))
	result := make([]string, 0, len(source))
	for _, dialect := range source {
		dialect = strings.ToLower(strings.TrimSpace(dialect))
		if dialect != "" && !seen[dialect] {
			seen[dialect] = true
			result = append(result, dialect)
		}
	}
	sort.Strings(result)
	return result
}

func selectedModels(source []SourceModel, ids []string, diagnostics *[]ExportDiagnostic) []SourceModel {
	if len(ids) == 0 {
		result := make([]SourceModel, 0, len(source))
		for _, model := range source {
			if model.UsageScope != "dfd_only" {
				result = append(result, model)
			}
		}
		return sortedModels(result)
	}
	byID := modelsByID(source)
	seen := make(map[string]bool, len(ids))
	result := make([]SourceModel, 0, len(ids))
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		model, ok := byID[id]
		if !ok {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.model.missing", "Selected model does not exist: "+id, "models/"+id, DiagnosticTarget{Kind: "model", ModelID: id}))
			continue
		}
		result = append(result, model)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func projectSQLTables(state ProjectState, models []SourceModel, diagnostics *[]ExportDiagnostic) []sqlTable {
	domains := make(map[string]SourceDomain, len(state.Domains))
	for _, domain := range state.Domains {
		domains[domain.ID] = domain
	}
	selected := make(map[string]bool, len(models))
	tablesByModel := make(map[string]*sqlTable, len(models))
	tables := make([]sqlTable, 0, len(models))
	tableNames := make(map[string]string, len(models))
	for _, model := range models {
		selected[model.ID] = true
		name := strings.TrimSpace(model.Names.Physical)
		if name == "" {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.table.physical_name_missing", "Model has no physical table name.", "models/"+model.ID+"/names/physical", DiagnosticTarget{Kind: "model", ModelID: model.ID}))
		} else if previous := tableNames[strings.ToLower(name)]; previous != "" {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.table.name_collision", fmt.Sprintf("Physical table name %q collides with model %s.", name, previous), "models/"+model.ID+"/names/physical", DiagnosticTarget{Kind: "model", ModelID: model.ID}))
		} else {
			tableNames[strings.ToLower(name)] = model.ID
		}
		table := sqlTable{Model: model, Name: name, Indexes: sortedIndexes(model.Indexes), AdditionalSQL: model.AdditionalSQL}
		columnNames := make(map[string]string)
		for _, field := range model.Fields {
			columns := projectSQLField(model, field, domains, diagnostics)
			for _, column := range columns {
				key := strings.ToLower(column.Name)
				if previous := columnNames[key]; key != "" && previous != "" {
					*diagnostics = append(*diagnostics, diagnostic("error", "sql.column.name_collision", fmt.Sprintf("Physical column name %q collides with field %s.", column.Name, previous), "models/"+model.ID+"/fields/"+field.ID+"/names/physical", DiagnosticTarget{Kind: "field", ModelID: model.ID, FieldID: field.ID}))
				} else if key != "" {
					columnNames[key] = field.ID
				}
				table.Columns = append(table.Columns, column)
				if column.PrimaryKey {
					table.PrimaryKey = append(table.PrimaryKey, column.Name)
				}
			}
		}
		tables = append(tables, table)
	}
	for index := range tables {
		tablesByModel[tables[index].Model.ID] = &tables[index]
	}

	modelsAll := modelsByID(state.Seeds)
	refs := referencesByRelationshipID(state.RelationshipReferences)
	relationshipsByID := make(map[string]bool, len(state.Relationships))
	for _, relationship := range state.Relationships {
		relationshipsByID[relationship.ID] = true
	}
	referenceCount := make(map[string]int, len(state.RelationshipReferences))
	for _, reference := range state.RelationshipReferences {
		referenceCount[reference.RelationshipID]++
		if !relationshipsByID[reference.RelationshipID] {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship_reference.orphan", "Relationship reference does not resolve to a relationship.", "relationshipReferences/"+reference.ID, DiagnosticTarget{Kind: "relationship", RelationshipID: reference.RelationshipID}))
		}
	}
	for _, relationship := range state.Relationships {
		if referenceCount[relationship.ID] != 1 {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship_reference.cardinality", "Relationship must have exactly one relationship-reference record.", "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID}))
		}
	}
	compositionOwners := make(map[string]string)
	compositionEdges := make(map[string]string)
	joinTables := make([]sqlTable, 0)
	for _, relationship := range state.Relationships {
		source, sourceOK := modelsAll[relationship.SourceID]
		target, targetOK := modelsAll[relationship.TargetID]
		if !sourceOK || !targetOK {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.endpoint_missing", "Relationship endpoint does not resolve.", "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID}))
			continue
		}
		if relationship.Kind == "composition" {
			if owner := compositionOwners[target.ID]; owner != "" && owner != source.ID {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.composition.multiple_owners", "Composition child has more than one owner.", "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID, ModelID: target.ID}))
			}
			compositionOwners[target.ID] = source.ID
			compositionEdges[target.ID] = source.ID
		}
		if source.UsageScope == "dfd_only" || target.UsageScope == "dfd_only" {
			continue
		}
		if !selected[source.ID] && !selected[target.ID] {
			continue
		}
		if !selected[source.ID] || !selected[target.ID] {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.selection_incomplete", "Both relationship endpoints must be selected for SQL export.", "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID}))
			continue
		}
		if strings.TrimSpace(relationship.Name) == "" {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.name_missing", "Relationship has no export name.", "relationships/"+relationship.ID+"/name", DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID}))
			continue
		}
		switch relationship.Kind {
		case "label":
			continue
		case "inherit":
			child, parent := source, target
			if relationship.Direction == "target-to-source" {
				child, parent = target, source
			}
			inheritParentColumns(tablesByModel[child.ID], tablesByModel[parent.ID], relationship, diagnostics)
		case "composition":
			relationship.OnDelete = "cascade"
			addProjectedForeignKey(tablesByModel[target.ID], tablesByModel[source.ID], relationship, refs[relationship.ID], true, state.NamingPolicy, diagnostics)
		case "foreign-key":
			sourceMany, targetMany := isMany(relationship.SourceMultiplicity), isMany(relationship.TargetMultiplicity)
			if sourceMany && targetMany {
				if join, ok := projectJoinTable(tablesByModel[source.ID], tablesByModel[target.ID], relationship, state.NamingPolicy, diagnostics); ok {
					joinTables = append(joinTables, join)
				}
				continue
			}
			if sourceMany != targetMany {
				if sourceMany {
					addProjectedForeignKey(tablesByModel[source.ID], tablesByModel[target.ID], relationship, refs[relationship.ID], relationship.TargetMultiplicity == "1", state.NamingPolicy, diagnostics)
				} else {
					addProjectedForeignKey(tablesByModel[target.ID], tablesByModel[source.ID], relationship, refs[relationship.ID], relationship.SourceMultiplicity == "1", state.NamingPolicy, diagnostics)
				}
			} else if relationship.Direction == "target-to-source" {
				addProjectedForeignKey(tablesByModel[target.ID], tablesByModel[source.ID], relationship, refs[relationship.ID], relationship.SourceMultiplicity == "1", state.NamingPolicy, diagnostics)
			} else {
				addProjectedForeignKey(tablesByModel[source.ID], tablesByModel[target.ID], relationship, refs[relationship.ID], relationship.TargetMultiplicity == "1", state.NamingPolicy, diagnostics)
			}
		default:
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.kind_unsupported", "Unsupported relationship kind: "+relationship.Kind, "relationships/"+relationship.ID+"/kind", DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID}))
		}
	}
	validateCompositionCycles(compositionEdges, diagnostics)
	tables = append(tables, joinTables...)
	sort.Slice(tables, func(i, j int) bool { return tables[i].Name < tables[j].Name })
	allTableNames := make(map[string]string, len(tables))
	for _, table := range tables {
		key := strings.ToLower(table.Name)
		if previous := allTableNames[key]; key != "" && previous != "" {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.table.name_collision", fmt.Sprintf("Physical table name %q collides with %s.", table.Name, previous), sqlTableSourcePath(table), DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
		} else if key != "" {
			allTableNames[key] = table.Model.ID
		}
	}
	for index := range tables {
		sort.Slice(tables[index].ForeignKeys, func(i, j int) bool { return tables[index].ForeignKeys[i].Name < tables[index].ForeignKeys[j].Name })
	}
	return tables
}

func projectSQLField(model SourceModel, field SourceField, domains map[string]SourceDomain, diagnostics *[]ExportDiagnostic) []sqlColumn {
	target := DiagnosticTarget{Kind: "field", ModelID: model.ID, FieldID: field.ID, DomainID: field.DomainID}
	path := "models/" + model.ID + "/fields/" + field.ID
	if strings.TrimSpace(field.Names.Physical) == "" {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.column.physical_name_missing", "Field has no physical column name.", path+"/names/physical", target))
	}
	if strings.TrimSpace(field.DomainID) == "" {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.column.domain_missing", "Field has no assigned data domain.", path+"/domainId", target))
		return []sqlColumn{{Name: field.Names.Physical, Required: field.Required || field.PrimaryKey, PrimaryKey: field.PrimaryKey, Unique: field.Unique, DefaultValue: field.DefaultValue, ValueGeneration: field.ValueGeneration, SourceFieldID: field.ID}}
	}
	domain, ok := domains[field.DomainID]
	if !ok {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.column.domain_undefined", "Assigned data domain does not exist.", path+"/domainId", target))
		return []sqlColumn{{Name: field.Names.Physical, Required: field.Required || field.PrimaryKey, PrimaryKey: field.PrimaryKey, Unique: field.Unique, DefaultValue: field.DefaultValue, ValueGeneration: field.ValueGeneration, SourceFieldID: field.ID}}
	}
	baseName := field.Names.Physical
	if field.UseDomainName {
		baseName += domain.Names.Physical
	}
	if domain.Shape == "composite" {
		if len(domain.Components) == 0 {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.domain.composite_empty", "Composite domain has no components.", "domains/"+domain.ID, target))
			return nil
		}
		columns := make([]sqlColumn, 0, len(domain.Components))
		for _, component := range domain.Components {
			resolved, ok := resolveSQLDomain(component.DomainID, domains, make(map[string]bool))
			if !ok {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.domain.component_unresolved", "Composite domain component cannot be resolved: "+component.Name, "domains/"+domain.ID+"/components/"+component.ID, DiagnosticTarget{Kind: "domain", ModelID: model.ID, FieldID: field.ID, DomainID: component.DomainID}))
			}
			columns = append(columns, sqlColumn{Name: baseName + strings.Join(strings.Fields(component.Name), ""), Domain: resolved, Required: field.Required || field.PrimaryKey || component.Required, PrimaryKey: field.PrimaryKey, Unique: field.Unique, DefaultValue: field.DefaultValue, ValueGeneration: field.ValueGeneration, SourceFieldID: field.ID, ComponentID: component.ID})
		}
		return columns
	}
	resolved, ok := resolveSQLDomain(domain.ID, domains, make(map[string]bool))
	if !ok {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.domain.unresolved", "Data domain does not resolve to a primitive type.", "domains/"+domain.ID, target))
	}
	return []sqlColumn{{Name: baseName, Domain: resolved, Required: field.Required || field.PrimaryKey, PrimaryKey: field.PrimaryKey, Unique: field.Unique, DefaultValue: field.DefaultValue, ValueGeneration: field.ValueGeneration, SourceFieldID: field.ID}}
}

func resolveSQLDomain(id string, domains map[string]SourceDomain, seen map[string]bool) (SourceDomain, bool) {
	if id == "" || seen[id] {
		return SourceDomain{}, false
	}
	seen[id] = true
	domain, ok := domains[id]
	if !ok {
		return SourceDomain{}, false
	}
	if domain.PrimitiveType != "" {
		return domain, true
	}
	if domain.Shape == "scalar" && len(domain.Components) == 1 {
		return resolveSQLDomain(domain.Components[0].DomainID, domains, seen)
	}
	return domain, false
}

func addProjectedForeignKey(local, remote *sqlTable, relationship SourceRelationship, reference SourceRelationshipReference, required bool, naming SourceNamingPolicy, diagnostics *[]ExportDiagnostic) {
	if local == nil || remote == nil {
		return
	}
	if len(remote.PrimaryKey) == 0 {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.target_primary_key_missing", "Referenced model has no primary key.", "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", ModelID: remote.Model.ID, RelationshipID: relationship.ID}))
		return
	}
	if relationship.OnDelete == "set_null" && required {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.foreign_key.set_null_required", "SET NULL is incompatible with required foreign-key columns.", "relationships/"+relationship.ID+"/onDelete", DiagnosticTarget{Kind: "relationship", ModelID: local.Model.ID, RelationshipID: relationship.ID}))
	}
	separator := naming.FieldSeparator
	if naming.FieldJoinMode == "concatenate" {
		separator = ""
	} else if separator == "" {
		separator = "_"
	}
	columns := make([]string, 0, len(remote.PrimaryKey))
	remoteByName := make(map[string]sqlColumn, len(remote.Columns))
	for _, column := range remote.Columns {
		remoteByName[column.Name] = column
	}
	existing := make(map[string]bool, len(local.Columns))
	for _, column := range local.Columns {
		existing[strings.ToLower(column.Name)] = true
	}
	for _, remoteName := range remote.PrimaryKey {
		name := relationship.Name + separator + remoteName
		if existing[strings.ToLower(name)] {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.column_collision", "Generated relationship column collides with an existing column: "+name, "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", ModelID: local.Model.ID, RelationshipID: relationship.ID}))
			continue
		}
		existing[strings.ToLower(name)] = true
		remoteColumn := remoteByName[remoteName]
		local.Columns = append(local.Columns, sqlColumn{Name: name, Domain: remoteColumn.Domain, Required: required, PrimaryKey: reference.PrimaryKey, RelationshipID: relationship.ID, RelationshipReferenceID: reference.ID})
		if reference.PrimaryKey {
			local.PrimaryKey = append(local.PrimaryKey, name)
		}
		columns = append(columns, name)
	}
	if len(columns) == len(remote.PrimaryKey) {
		local.ForeignKeys = append(local.ForeignKeys, sqlForeignKey{Name: "fk_" + safeSQLName(local.Name+"_"+relationship.Name), Columns: columns, ReferencedTable: remote.Name, ReferencedColumn: append([]string(nil), remote.PrimaryKey...), OnDelete: relationship.OnDelete, RelationshipID: relationship.ID})
	}
}

func inheritParentColumns(child, parent *sqlTable, relationship SourceRelationship, diagnostics *[]ExportDiagnostic) {
	if child == nil || parent == nil {
		return
	}
	existing := make(map[string]bool, len(child.Columns))
	for _, column := range child.Columns {
		existing[strings.ToLower(column.Name)] = true
	}
	inherited := make([]sqlColumn, 0, len(parent.Columns))
	inheritedPrimaryKey := make([]string, 0, len(parent.PrimaryKey))
	for _, column := range parent.Columns {
		if existing[strings.ToLower(column.Name)] {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.inherit.column_collision", "Inherited column collides with a child column: "+column.Name, "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", ModelID: child.Model.ID, RelationshipID: relationship.ID}))
			continue
		}
		copied := column
		copied.RelationshipID = relationship.ID
		inherited = append(inherited, copied)
		if copied.PrimaryKey {
			inheritedPrimaryKey = append(inheritedPrimaryKey, copied.Name)
		}
	}
	child.Columns = append(inherited, child.Columns...)
	child.PrimaryKey = append(inheritedPrimaryKey, child.PrimaryKey...)
}

func projectJoinTable(source, target *sqlTable, relationship SourceRelationship, naming SourceNamingPolicy, diagnostics *[]ExportDiagnostic) (sqlTable, bool) {
	if source == nil || target == nil {
		return sqlTable{}, false
	}
	if len(source.PrimaryKey) == 0 || len(target.PrimaryKey) == 0 {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.target_primary_key_missing", "Both many-to-many endpoints require primary keys.", "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID}))
		return sqlTable{}, false
	}
	separator := naming.FieldSeparator
	if naming.FieldJoinMode == "concatenate" {
		separator = ""
	} else if separator == "" {
		separator = "_"
	}
	join := sqlTable{Model: SourceModel{ID: "relationship:" + relationship.ID}, Name: relationship.Name}
	appendEndpoint := func(endpoint *sqlTable) ([]string, []string) {
		localNames := make([]string, 0, len(endpoint.PrimaryKey))
		remoteNames := append([]string(nil), endpoint.PrimaryKey...)
		byName := make(map[string]sqlColumn, len(endpoint.Columns))
		for _, column := range endpoint.Columns {
			byName[column.Name] = column
		}
		for _, primaryName := range endpoint.PrimaryKey {
			name := endpoint.Name + separator + primaryName
			column := byName[primaryName]
			join.Columns = append(join.Columns, sqlColumn{Name: name, Domain: column.Domain, Required: true, PrimaryKey: true, RelationshipID: relationship.ID})
			join.PrimaryKey = append(join.PrimaryKey, name)
			localNames = append(localNames, name)
		}
		return localNames, remoteNames
	}
	sourceLocal, sourceRemote := appendEndpoint(source)
	targetLocal, targetRemote := appendEndpoint(target)
	seen := make(map[string]bool, len(join.Columns))
	for _, column := range join.Columns {
		key := strings.ToLower(column.Name)
		if seen[key] {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.relationship.join_column_collision", "Many-to-many join columns collide: "+column.Name, "relationships/"+relationship.ID, DiagnosticTarget{Kind: "relationship", RelationshipID: relationship.ID}))
			return sqlTable{}, false
		}
		seen[key] = true
	}
	join.ForeignKeys = []sqlForeignKey{
		{Name: "fk_" + safeSQLName(join.Name+"_"+source.Name), Columns: sourceLocal, ReferencedTable: source.Name, ReferencedColumn: sourceRemote, RelationshipID: relationship.ID},
		{Name: "fk_" + safeSQLName(join.Name+"_"+target.Name), Columns: targetLocal, ReferencedTable: target.Name, ReferencedColumn: targetRemote, RelationshipID: relationship.ID},
	}
	return join, true
}

func validateCompositionCycles(edges map[string]string, diagnostics *[]ExportDiagnostic) {
	for start := range edges {
		seen := make(map[string]bool)
		current := start
		for current != "" {
			if seen[current] {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.composition.cycle", "Composition ownership path contains a cycle.", "models/"+current, DiagnosticTarget{Kind: "model", ModelID: current}))
				break
			}
			seen[current] = true
			current = edges[current]
		}
	}
}

func validateDialectProjection(dialect string, tables []sqlTable, diagnostics *[]ExportDiagnostic) {
	startDiagnostic := len(*diagnostics)
	if dialect == "duckdb" && hasForeignKeyCycle(tables) {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.foreign_key.duckdb_cycle", "DuckDB cannot create this cyclic inline foreign-key graph without deferred constraints.", "export/sql/dialects/duckdb", DiagnosticTarget{Kind: "export"}))
	}
	for _, table := range tables {
		tablePath := sqlTableSourcePath(table)
		autoIncrementColumns := 0
		if strings.ContainsRune(table.Name, '\x00') {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.identifier.invalid", "Table name contains an invalid NUL character.", tablePath, DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
		}
		validateSQLIdentifier(dialect, table.Name, "table", tablePath, DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}, diagnostics)
		if table.Model.Partitioning.Strategy != "" || len(table.Model.Partitioning.Keys) > 0 || len(table.Model.Partitioning.Ranges) > 0 {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.partitioning.unsupported", fmt.Sprintf("%s partition projection is not available yet.", dialect), "models/"+table.Model.ID+"/partitioning", DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
		}
		columnNames := projectedColumnNames(table)
		columnsByName := make(map[string]sqlColumn, len(table.Columns))
		for _, column := range table.Columns {
			columnsByName[column.Name] = column
		}
		indexNames := make(map[string]bool, len(table.Indexes))
		for _, index := range table.Indexes {
			indexPath := tablePath + "/indexes/" + index.ID
			validateSQLIdentifier(dialect, index.Name, "index", indexPath+"/name", DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}, diagnostics)
			if strings.TrimSpace(index.Name) == "" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.index.name_missing", "Index has no physical name.", indexPath+"/name", DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
			} else if indexNames[strings.ToLower(index.Name)] {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.index.name_collision", "Index name is duplicated: "+index.Name, indexPath+"/name", DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
			}
			indexNames[strings.ToLower(index.Name)] = true
			if len(index.Keys) == 0 {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.index.keys_missing", "Index has no keys.", indexPath+"/keys", DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
			}
			for _, key := range index.Keys {
				projectedName := columnNames[indexKeyID(key)]
				if projectedName == "" {
					*diagnostics = append(*diagnostics, diagnostic("error", "sql.index.key_unresolved", "Index key does not resolve to a projected column.", indexPath+"/keys/"+key.SourceID, DiagnosticTarget{Kind: "model", ModelID: table.Model.ID, FieldID: key.SourceID}))
				} else if dialect == "mysql" {
					primitive := columnsByName[projectedName].Domain.PrimitiveType
					if primitive == "text" || primitive == "blob" {
						*diagnostics = append(*diagnostics, diagnostic("error", "sql.index.mysql_prefix_required", "MySQL text/blob indexes require a prefix length, which is not modeled.", indexPath+"/keys/"+key.SourceID, DiagnosticTarget{Kind: "model", ModelID: table.Model.ID, FieldID: key.SourceID}))
					}
				}
			}
			if dialect == "bigquery" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.index.unsupported", "BigQuery does not support this portable index definition.", indexPath, DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
			}
		}
		for _, column := range table.Columns {
			path := "models/" + table.Model.ID + "/fields/" + column.SourceFieldID
			if column.RelationshipID != "" {
				path = "relationships/" + column.RelationshipID
			}
			if strings.ContainsRune(column.Name, '\x00') {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.identifier.invalid", "Column name contains an invalid NUL character.", path, DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID, RelationshipID: column.RelationshipID}))
			}
			validateSQLIdentifier(dialect, column.Name, "column", path, DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID, RelationshipID: column.RelationshipID}, diagnostics)
			if _, ok := sqlType(dialect, column.Domain); !ok {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.type.unsupported", fmt.Sprintf("%s cannot map primitive type %q.", dialect, column.Domain.PrimitiveType), path, DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID, RelationshipID: column.RelationshipID, DomainID: column.Domain.ID}))
			}
			if column.ValueGeneration != "" && column.ValueGeneration != "auto_increment" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.generation.unknown", "Unknown value-generation rule: "+column.ValueGeneration, path+"/valueGeneration", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if column.ValueGeneration == "auto_increment" && (!column.PrimaryKey || column.Domain.PrimitiveType != "integer") {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.generation.requires_integer_primary_key", "Auto increment requires an integer primary-key field.", path+"/valueGeneration", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if column.ValueGeneration == "auto_increment" {
				autoIncrementColumns++
				if dialect == "mysql" && (len(table.PrimaryKey) == 0 || table.PrimaryKey[0] != column.Name) {
					*diagnostics = append(*diagnostics, diagnostic("error", "sql.generation.mysql_key_order", "MySQL AUTO_INCREMENT must be the first column of the primary key.", path+"/valueGeneration", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
				}
			}
			if column.ValueGeneration != "" && column.DefaultValue.Kind != "" && column.DefaultValue.Kind != "none" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.generation.default_conflict", "A generated column cannot also declare a default.", path+"/defaultValue", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if message := invalidDefaultMessage(column); message != "" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.default.invalid", message, path+"/defaultValue", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if dialect == "bigquery" && column.PrimaryKey && column.DefaultValue.Kind != "" && column.DefaultValue.Kind != "none" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.default.bigquery_primary_key", "BigQuery does not allow defaults on primary-key columns.", path+"/defaultValue", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if column.Domain.PrimitiveType == "varchar" && column.Domain.Length <= 0 {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.type.length_missing", "Varchar domain requires a positive length.", "domains/"+column.Domain.ID+"/length", DiagnosticTarget{Kind: "domain", DomainID: column.Domain.ID}))
			}
			if column.Domain.PrimitiveType == "decimal" && column.Domain.Precision <= 0 {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.type.precision_missing", "Decimal domain requires a positive precision.", "domains/"+column.Domain.ID+"/precision", DiagnosticTarget{Kind: "domain", DomainID: column.Domain.ID}))
			}
			if column.ValueGeneration == "auto_increment" && dialect != "mysql" && dialect != "postgresql" && dialect != "sqlite" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.generation.unsupported", fmt.Sprintf("%s does not support the modeled auto-increment projection.", dialect), path+"/valueGeneration", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if column.ValueGeneration == "auto_increment" && dialect == "sqlite" && (len(table.PrimaryKey) != 1 || column.Domain.PrimitiveType != "integer") {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.generation.sqlite_requires_integer_primary_key", "SQLite AUTOINCREMENT requires a single INTEGER primary key.", path+"/valueGeneration", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if column.Domain.Unsigned && dialect != "mysql" && dialect != "duckdb" {
				*diagnostics = append(*diagnostics, diagnostic("warning", "sql.type.unsigned_range", fmt.Sprintf("%s maps an unsigned integer to a signed type.", dialect), path, DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if column.Unique && !column.PrimaryKey && dialect == "bigquery" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.unique.unsupported", "BigQuery does not support enforced UNIQUE constraints.", path+"/unique", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
			if column.Unique && !column.PrimaryKey && dialect == "mysql" && (column.Domain.PrimitiveType == "text" || column.Domain.PrimitiveType == "blob") {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.unique.mysql_prefix_required", "MySQL text/blob unique constraints require a prefix length, which is not modeled.", path+"/unique", DiagnosticTarget{Kind: "field", ModelID: table.Model.ID, FieldID: column.SourceFieldID}))
			}
		}
		if autoIncrementColumns > 1 {
			*diagnostics = append(*diagnostics, diagnostic("error", "sql.generation.multiple_auto_increment", "A table cannot contain more than one auto-increment column.", tablePath, DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
		}
		constraintNames := make(map[string]bool, len(table.ForeignKeys))
		for _, foreignKey := range table.ForeignKeys {
			validateSQLIdentifier(dialect, foreignKey.Name, "constraint", "relationships/"+foreignKey.RelationshipID, DiagnosticTarget{Kind: "relationship", RelationshipID: foreignKey.RelationshipID}, diagnostics)
			constraintKey := strings.ToLower(foreignKey.Name)
			if constraintNames[constraintKey] {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.constraint.name_collision", "Generated constraint name is duplicated: "+foreignKey.Name, "relationships/"+foreignKey.RelationshipID, DiagnosticTarget{Kind: "relationship", RelationshipID: foreignKey.RelationshipID}))
			}
			constraintNames[constraintKey] = true
			if dialect == "duckdb" && foreignKey.OnDelete != "" && foreignKey.OnDelete != "no_action" && foreignKey.OnDelete != "restrict" {
				*diagnostics = append(*diagnostics, diagnostic("error", "sql.foreign_key.delete_action_unsupported", "DuckDB does not support cascading foreign-key delete actions.", "relationships/"+foreignKey.RelationshipID+"/onDelete", DiagnosticTarget{Kind: "relationship", RelationshipID: foreignKey.RelationshipID}))
			}
			if dialect == "bigquery" {
				*diagnostics = append(*diagnostics, diagnostic("warning", "sql.constraint.not_enforced", "BigQuery records primary and foreign keys as NOT ENFORCED.", "relationships/"+foreignKey.RelationshipID, DiagnosticTarget{Kind: "relationship", RelationshipID: foreignKey.RelationshipID}))
				if foreignKey.OnDelete != "" && foreignKey.OnDelete != "no_action" {
					*diagnostics = append(*diagnostics, diagnostic("warning", "sql.foreign_key.delete_action_not_enforced", "BigQuery does not enforce the modeled delete action.", "relationships/"+foreignKey.RelationshipID+"/onDelete", DiagnosticTarget{Kind: "relationship", RelationshipID: foreignKey.RelationshipID}))
				}
			}
		}
		if strings.TrimSpace(table.AdditionalSQL) != "" {
			*diagnostics = append(*diagnostics, diagnostic("warning", "sql.additional_sql.target_specific", fmt.Sprintf("Additional SQL is appended verbatim to the %s artifact.", dialect), "models/"+table.Model.ID+"/additionalSql", DiagnosticTarget{Kind: "model", ModelID: table.Model.ID}))
		}
	}
	for index := startDiagnostic; index < len(*diagnostics); index++ {
		(*diagnostics)[index].ArtifactID = dialect + ".sql"
	}
}

func validateSQLIdentifier(dialect, value, kind, path string, target DiagnosticTarget, diagnostics *[]ExportDiagnostic) {
	limit := 0
	switch dialect {
	case "mysql":
		limit = 64
	case "postgresql":
		limit = 63
	case "bigquery":
		limit = 300
	}
	if limit > 0 && len([]byte(value)) > limit {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.identifier.too_long", fmt.Sprintf("%s identifier exceeds the %s limit of %d bytes.", kind, dialect, limit), path, target))
	}
	if dialect == "bigquery" && !isSimpleBigQueryIdentifier(value) {
		*diagnostics = append(*diagnostics, diagnostic("error", "sql.identifier.bigquery_invalid", fmt.Sprintf("%s identifier must contain only letters, numbers, and underscores and cannot start with a number.", kind), path, target))
	}
}

func isSimpleBigQueryIdentifier(value string) bool {
	if value == "" {
		return false
	}
	for index, current := range value {
		letter := (current >= 'a' && current <= 'z') || (current >= 'A' && current <= 'Z') || current == '_'
		digit := current >= '0' && current <= '9'
		if (!letter && !digit) || (index == 0 && digit) {
			return false
		}
	}
	return true
}

func sqlTableSourcePath(table sqlTable) string {
	if strings.HasPrefix(table.Model.ID, "relationship:") {
		return "relationships/" + strings.TrimPrefix(table.Model.ID, "relationship:")
	}
	return "models/" + table.Model.ID
}

func renderDDL(dialect string, tables []sqlTable) string {
	var out strings.Builder
	fmt.Fprintf(&out, "-- erdsketch SQL export (%s)\n\n", dialect)
	for _, table := range orderedTablesForCreate(dialect, tables) {
		fmt.Fprintf(&out, "CREATE TABLE %s (\n", quoteIdentifier(dialect, table.Name))
		definitions := make([]string, 0, len(table.Columns)+len(table.ForeignKeys)+len(table.PrimaryKey)+4)
		sqliteInlinePK := ""
		for _, column := range table.Columns {
			typeName, _ := sqlType(dialect, column.Domain)
			definition := "  " + quoteIdentifier(dialect, column.Name) + " " + typeName
			if dialect == "sqlite" && column.ValueGeneration == "auto_increment" {
				definition += " PRIMARY KEY AUTOINCREMENT"
				sqliteInlinePK = column.Name
			} else {
				if column.ValueGeneration == "auto_increment" {
					if dialect == "mysql" {
						definition += " AUTO_INCREMENT"
					} else if dialect == "postgresql" {
						definition += " GENERATED BY DEFAULT AS IDENTITY"
					}
				}
				if column.Required {
					definition += " NOT NULL"
				}
			}
			if value := renderDefault(dialect, column); value != "" {
				definition += " DEFAULT " + value
			}
			definitions = append(definitions, definition)
		}
		if len(table.PrimaryKey) > 0 && !(len(table.PrimaryKey) == 1 && table.PrimaryKey[0] == sqliteInlinePK) {
			clause := "  PRIMARY KEY (" + quotedList(dialect, table.PrimaryKey) + ")"
			if dialect == "bigquery" {
				clause += " NOT ENFORCED"
			}
			definitions = append(definitions, clause)
		}
		for _, column := range table.Columns {
			if column.Unique && !column.PrimaryKey {
				definitions = append(definitions, "  UNIQUE ("+quoteIdentifier(dialect, column.Name)+")")
			}
		}
		if !supportsDeferredForeignKeys(dialect) {
			for _, foreignKey := range table.ForeignKeys {
				definitions = append(definitions, "  "+renderForeignKeyClause(dialect, foreignKey))
			}
		}
		out.WriteString(strings.Join(definitions, ",\n"))
		out.WriteString("\n);\n\n")
	}
	for _, table := range tables {
		columnNames := projectedColumnNames(table)
		for _, index := range table.Indexes {
			keys := make([]string, 0, len(index.Keys))
			for _, key := range index.Keys {
				if name := columnNames[indexKeyID(key)]; name != "" {
					direction := ""
					if key.Direction == "descending" {
						direction = " DESC"
					}
					keys = append(keys, quoteIdentifier(dialect, name)+direction)
				}
			}
			if len(keys) > 0 {
				unique := ""
				if index.Unique {
					unique = "UNIQUE "
				}
				fmt.Fprintf(&out, "CREATE %sINDEX %s ON %s (%s);\n", unique, quoteIdentifier(dialect, index.Name), quoteIdentifier(dialect, table.Name), strings.Join(keys, ", "))
			}
		}
	}
	if supportsDeferredForeignKeys(dialect) {
		for _, table := range tables {
			for _, foreignKey := range table.ForeignKeys {
				fmt.Fprintf(&out, "ALTER TABLE %s ADD %s;\n", quoteIdentifier(dialect, table.Name), renderForeignKeyClause(dialect, foreignKey))
			}
		}
		out.WriteByte('\n')
	}
	for _, table := range tables {
		if strings.TrimSpace(table.AdditionalSQL) != "" {
			out.WriteString("\n-- Additional SQL for ")
			out.WriteString(table.Name)
			out.WriteByte('\n')
			out.WriteString(strings.TrimSpace(table.AdditionalSQL))
			out.WriteString("\n")
		}
	}
	return out.String()
}

func orderedTablesForCreate(dialect string, tables []sqlTable) []sqlTable {
	if supportsDeferredForeignKeys(dialect) || dialect == "sqlite" {
		return tables
	}
	byName := make(map[string]sqlTable, len(tables))
	for _, table := range tables {
		byName[table.Name] = table
	}
	visited := make(map[string]bool)
	visiting := make(map[string]bool)
	result := make([]sqlTable, 0, len(tables))
	var visit func(string)
	visit = func(name string) {
		if visited[name] || visiting[name] {
			return
		}
		visiting[name] = true
		table, ok := byName[name]
		if ok {
			dependencies := make([]string, 0, len(table.ForeignKeys))
			for _, foreignKey := range table.ForeignKeys {
				dependencies = append(dependencies, foreignKey.ReferencedTable)
			}
			sort.Strings(dependencies)
			for _, dependency := range dependencies {
				visit(dependency)
			}
			result = append(result, table)
		}
		visiting[name] = false
		visited[name] = true
	}
	for _, table := range tables {
		visit(table.Name)
	}
	return result
}

func supportsDeferredForeignKeys(dialect string) bool {
	return dialect == "mysql" || dialect == "postgresql" || dialect == "bigquery"
}

func renderForeignKeyClause(dialect string, foreignKey sqlForeignKey) string {
	clause := "CONSTRAINT " + quoteIdentifier(dialect, foreignKey.Name) + " FOREIGN KEY (" + quotedList(dialect, foreignKey.Columns) + ") REFERENCES " + quoteIdentifier(dialect, foreignKey.ReferencedTable) + " (" + quotedList(dialect, foreignKey.ReferencedColumn) + ")"
	if dialect == "bigquery" {
		return clause + " NOT ENFORCED"
	}
	if foreignKey.OnDelete != "" && foreignKey.OnDelete != "no_action" {
		clause += " ON DELETE " + strings.ReplaceAll(strings.ToUpper(foreignKey.OnDelete), "_", " ")
	}
	return clause
}

func hasForeignKeyCycle(tables []sqlTable) bool {
	edges := make(map[string][]string, len(tables))
	for _, table := range tables {
		for _, foreignKey := range table.ForeignKeys {
			edges[table.Name] = append(edges[table.Name], foreignKey.ReferencedTable)
		}
	}
	visiting := make(map[string]bool)
	visited := make(map[string]bool)
	var visit func(string) bool
	visit = func(table string) bool {
		if visiting[table] {
			return true
		}
		if visited[table] {
			return false
		}
		visiting[table] = true
		for _, target := range edges[table] {
			if visit(target) {
				return true
			}
		}
		visiting[table] = false
		visited[table] = true
		return false
	}
	for table := range edges {
		if visit(table) {
			return true
		}
	}
	return false
}

func sqlType(dialect string, domain SourceDomain) (string, bool) {
	primitive := domain.PrimitiveType
	if primitive == "code_set" {
		domain = codeSetStorageDomain(domain)
		primitive = domain.PrimitiveType
	}
	switch dialect {
	case "mysql":
		switch primitive {
		case "integer":
			result := mapIntegerBits(domain.Bits, "TINYINT", "SMALLINT", "INT", "BIGINT")
			if domain.Unsigned {
				result += " UNSIGNED"
			}
			return result, true
		case "decimal":
			return decimalType("DECIMAL", domain), true
		case "floating_point":
			if domain.Bits > 0 && domain.Bits <= 32 {
				return "FLOAT", true
			}
			return "DOUBLE", true
		case "varchar":
			return "VARCHAR(" + strconv.Itoa(domain.Length) + ")", true
		case "text":
			return "TEXT", true
		case "blob":
			return "BLOB", true
		case "date":
			return "DATE", true
		case "time":
			return "TIME", true
		case "datetime":
			return "DATETIME", true
		case "datetime_with_timezone":
			return "TIMESTAMP", true
		case "boolean":
			return "BOOLEAN", true
		case "uuid":
			return "CHAR(36)", true
		}
	case "postgresql":
		switch primitive {
		case "integer":
			return mapIntegerBits(domain.Bits, "SMALLINT", "SMALLINT", "INTEGER", "BIGINT"), true
		case "decimal":
			return decimalType("NUMERIC", domain), true
		case "floating_point":
			if domain.Bits > 0 && domain.Bits <= 32 {
				return "REAL", true
			}
			return "DOUBLE PRECISION", true
		case "varchar":
			return "VARCHAR(" + strconv.Itoa(domain.Length) + ")", true
		case "text":
			return "TEXT", true
		case "blob":
			return "BYTEA", true
		case "date":
			return "DATE", true
		case "time":
			return "TIME", true
		case "datetime":
			return "TIMESTAMP WITHOUT TIME ZONE", true
		case "datetime_with_timezone":
			return "TIMESTAMP WITH TIME ZONE", true
		case "boolean":
			return "BOOLEAN", true
		case "uuid":
			return "UUID", true
		}
	case "sqlite":
		switch primitive {
		case "integer", "boolean":
			return "INTEGER", true
		case "decimal":
			return "NUMERIC", true
		case "floating_point":
			return "REAL", true
		case "varchar", "text", "date", "time", "datetime", "datetime_with_timezone", "uuid":
			return "TEXT", true
		case "blob":
			return "BLOB", true
		}
	case "duckdb":
		switch primitive {
		case "integer":
			if domain.Unsigned {
				return mapIntegerBits(domain.Bits, "UTINYINT", "USMALLINT", "UINTEGER", "UBIGINT"), true
			}
			return mapIntegerBits(domain.Bits, "TINYINT", "SMALLINT", "INTEGER", "BIGINT"), true
		case "decimal":
			return decimalType("DECIMAL", domain), true
		case "floating_point":
			if domain.Bits > 0 && domain.Bits <= 32 {
				return "FLOAT", true
			}
			return "DOUBLE", true
		case "varchar", "text":
			return "VARCHAR", true
		case "blob":
			return "BLOB", true
		case "date":
			return "DATE", true
		case "time":
			return "TIME", true
		case "datetime":
			return "TIMESTAMP", true
		case "datetime_with_timezone":
			return "TIMESTAMPTZ", true
		case "boolean":
			return "BOOLEAN", true
		case "uuid":
			return "UUID", true
		}
	case "bigquery":
		switch primitive {
		case "integer":
			return "INT64", true
		case "decimal":
			if domain.Precision > 38 {
				return "BIGNUMERIC", true
			}
			return "NUMERIC", true
		case "floating_point":
			return "FLOAT64", true
		case "varchar", "text", "uuid":
			return "STRING", true
		case "blob":
			return "BYTES", true
		case "date":
			return "DATE", true
		case "time":
			return "TIME", true
		case "datetime":
			return "DATETIME", true
		case "datetime_with_timezone":
			return "TIMESTAMP", true
		case "boolean":
			return "BOOL", true
		}
	}
	return "", false
}

func renderDefault(dialect string, column sqlColumn) string {
	switch column.DefaultValue.Kind {
	case "literal":
		primitive := column.Domain.PrimitiveType
		if primitive == "code_set" {
			primitive = column.Domain.CodeSetBaseType
		}
		if primitive == "integer" || primitive == "decimal" || primitive == "floating_point" || primitive == "boolean" {
			return column.DefaultValue.Value
		}
		return "'" + strings.ReplaceAll(column.DefaultValue.Value, "'", "''") + "'"
	case "current_date":
		if dialect == "bigquery" {
			return "CURRENT_DATE()"
		}
		return "CURRENT_DATE"
	case "current_timestamp":
		if dialect == "bigquery" {
			return "CURRENT_TIMESTAMP()"
		}
		return "CURRENT_TIMESTAMP"
	}
	return ""
}

func invalidDefaultMessage(column sqlColumn) string {
	kind := column.DefaultValue.Kind
	primitive := column.Domain.PrimitiveType
	if primitive == "code_set" {
		primitive = column.Domain.CodeSetBaseType
	}
	switch kind {
	case "", "none":
		return ""
	case "current_date":
		if primitive != "date" {
			return "CURRENT_DATE is only valid for date columns."
		}
	case "current_timestamp":
		if primitive != "datetime" && primitive != "datetime_with_timezone" {
			return "CURRENT_TIMESTAMP is only valid for datetime columns."
		}
	case "literal":
		value := strings.TrimSpace(column.DefaultValue.Value)
		if value == "" {
			return "Literal defaults cannot be empty."
		}
		switch primitive {
		case "integer":
			if _, err := strconv.ParseInt(value, 10, 64); err != nil {
				return "Integer default is not a valid integer literal."
			}
		case "decimal", "floating_point":
			if _, err := strconv.ParseFloat(value, 64); err != nil {
				return "Numeric default is not a valid number literal."
			}
		case "boolean":
			if value != "true" && value != "false" && value != "0" && value != "1" {
				return "Boolean default must be true, false, 0, or 1."
			}
		}
	default:
		return "Unknown default kind: " + kind
	}
	return ""
}

func codeSetStorageDomain(domain SourceDomain) SourceDomain {
	domain.PrimitiveType = domain.CodeSetBaseType
	switch domain.PrimitiveType {
	case "varchar":
		if domain.Length <= 0 {
			for _, entry := range domain.CodeSetEntries {
				if len(entry.Value) > domain.Length {
					domain.Length = len(entry.Value)
				}
			}
			if domain.Length == 0 {
				domain.Length = 1
			}
		}
	case "decimal":
		if domain.Precision <= 0 {
			domain.Precision = 38
			domain.Scale = 9
		}
	case "integer":
		if domain.Bits == 0 {
			domain.Bits = 64
		}
	}
	return domain
}

func quoteIdentifier(dialect, value string) string {
	if dialect == "mysql" || dialect == "bigquery" {
		return "`" + strings.ReplaceAll(value, "`", "``") + "`"
	}
	return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
}

func quotedList(dialect string, values []string) string {
	result := make([]string, len(values))
	for index, value := range values {
		result[index] = quoteIdentifier(dialect, value)
	}
	return strings.Join(result, ", ")
}

func mapIntegerBits(bits int, eight, sixteen, thirtyTwo, sixtyFour string) string {
	if bits <= 8 && bits > 0 {
		return eight
	}
	if bits <= 16 && bits > 0 {
		return sixteen
	}
	if bits <= 32 || bits == 0 {
		return thirtyTwo
	}
	return sixtyFour
}

func decimalType(name string, domain SourceDomain) string {
	return fmt.Sprintf("%s(%d,%d)", name, domain.Precision, domain.Scale)
}

func isMany(multiplicity string) bool { return strings.Contains(multiplicity, "*") }

func safeSQLName(value string) string {
	var out strings.Builder
	for _, current := range strings.ToLower(value) {
		if (current >= 'a' && current <= 'z') || (current >= '0' && current <= '9') || current == '_' {
			out.WriteRune(current)
		} else {
			out.WriteByte('_')
		}
	}
	return strings.Trim(out.String(), "_")
}

func projectedColumnNames(table sqlTable) map[string]string {
	result := make(map[string]string)
	for _, column := range table.Columns {
		if column.SourceFieldID != "" {
			suffix := column.ComponentID
			if suffix == "" {
				suffix = "scalar"
			}
			result["field:"+column.SourceFieldID+":"+suffix] = column.Name
		}
		if column.RelationshipReferenceID != "" {
			result["relationship:"+column.RelationshipReferenceID+":"] = column.Name
		}
	}
	return result
}

func indexKeyID(key SourceIndexKey) string {
	suffix := key.ComponentID
	if suffix == "" && key.Source == "field" {
		suffix = "scalar"
	}
	return key.Source + ":" + key.SourceID + ":" + suffix
}

func diagnostic(severity, code, message, path string, target DiagnosticTarget) ExportDiagnostic {
	sourceID := target.RelationshipID
	if sourceID == "" {
		sourceID = target.DomainID
	}
	if sourceID == "" {
		sourceID = target.FieldID
	}
	if sourceID == "" {
		sourceID = target.ModelID
	}
	return ExportDiagnostic{
		Severity: severity, Code: code, Message: message, ExportMode: "sql",
		SourceKind: target.Kind, SourceID: sourceID, SourcePath: path,
		EditorTarget: target.Kind, Target: target,
	}
}

func sortDiagnostics(diagnostics []ExportDiagnostic) {
	sort.Slice(diagnostics, func(i, j int) bool {
		if diagnostics[i].ArtifactID != diagnostics[j].ArtifactID {
			return diagnostics[i].ArtifactID < diagnostics[j].ArtifactID
		}
		if diagnostics[i].SourcePath != diagnostics[j].SourcePath {
			return diagnostics[i].SourcePath < diagnostics[j].SourcePath
		}
		return diagnostics[i].Code < diagnostics[j].Code
	})
}

func hasErrorDiagnostics(diagnostics []ExportDiagnostic) bool {
	for _, item := range diagnostics {
		if item.Severity == "error" {
			return true
		}
	}
	return false
}
