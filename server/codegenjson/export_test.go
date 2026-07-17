package codegenjson

import (
	"encoding/json"
	"encoding/xml"
	"io"
	"strings"
	"testing"
)

func TestGenerateMarkdownBuildsCompleteInventory(t *testing.T) {
	state := validExportState()
	model := state["seeds"].([]any)[0].(map[string]any)
	model["dependency"] = "independent"
	model["hasPrivacy"] = true
	model["maturedLevel"] = 1.25
	model["usageScope"] = "shared"
	model["indexes"] = []any{map[string]any{"id": "order-label-index", "name": "idx_order_label", "keys": []any{map[string]any{"source": "field", "sourceId": "order-label", "direction": "ascending"}}}}
	model["partitioning"] = map[string]any{
		"strategy": "range",
		"keys":     []any{map[string]any{"fieldId": "order-id"}},
		"ranges": []any{map[string]any{
			"id": "recent", "name": "Recent",
			"from": []any{map[string]any{"kind": "literal", "value": "1"}},
			"to":   []any{map[string]any{"kind": "maxvalue"}},
		}},
	}
	model["volumeEstimate"] = map[string]any{"initialRecordCount": 100, "growthRate": map[string]any{"amount": 20, "period": "day"}, "retentionPeriod": map[string]any{"value": 1, "unit": "year"}, "maximumRecordCount": 10000}
	model["additionalSql"] = "COMMENT ON TABLE orders IS 'archive yearly';"
	model["fields"].([]any)[1].(map[string]any)["estimatedAverageSizeBytes"] = 24.0
	input := canonicalExportFixture(t, state)
	result, err := GenerateMarkdown(input, MarkdownOptions{
		NameMode: "physical", ModelCardContent: "description",
		GeneratedAt: "2026-07-17T12:00:00Z", SourceSnapshotRevision: "revision-7",
	})
	if err != nil {
		t.Fatal(err)
	}
	artifacts := artifactsByPath(result.Artifacts)
	for _, path := range []string{"index.md", "tables/order.md", "vocabulary.md", "domains.md", "relationships.md", "dfd-processes-and-flows.md", "crud-assignments.md", "diagrams/erd/main.md", "diagrams/erd/main.svg", "diagrams/dfd/main.md", "diagrams/dfd/main.svg", "diagrams/crud-matrix.svg", "manifest.json"} {
		if _, ok := artifacts[path]; !ok {
			t.Errorf("missing artifact %s", path)
		}
	}
	if got := artifacts["tables/order.md"].Content; !strings.Contains(got, "| order_id |") || !strings.Contains(got, "Order aggregate") || !strings.Contains(got, "independent, transaction, privacy") || !strings.Contains(got, "Logical model") || !strings.Contains(got, `idx\_order\_label`) || !strings.Contains(got, "20 per day") || !strings.Contains(got, "```sql") || !strings.Contains(got, "[integer](../domains.md#domain-integer-domain)") {
		t.Fatalf("table inventory is incomplete:\n%s", got)
	}
	if got := artifacts["vocabulary.md"].Content; !strings.Contains(got, `Order \| Purchase`) {
		t.Fatalf("Markdown table value was not escaped:\n%s", got)
	}
	manifest := artifacts["manifest.json"].Content
	if !strings.Contains(manifest, `"generatedAt": "2026-07-17T12:00:00Z"`) || !strings.Contains(manifest, `"tables/order.md"`) || !strings.Contains(manifest, `"manifest.json"`) {
		t.Fatalf("manifest does not account for output:\n%s", manifest)
	}
	if got := artifacts["index.md"].Content; !strings.Contains(got, "[Main ERD](diagrams/erd/main.md)") || !strings.Contains(got, "[Main DFD](diagrams/dfd/main.md)") || !strings.Contains(got, "[orders](tables/order.md)") || strings.Contains(got, "![ERD:") || strings.Contains(got, "![DFD:") {
		t.Fatalf("index does not link dedicated diagram pages:\n%s", got)
	}
	if got := artifacts["diagrams/erd/main.md"].Content; !strings.Contains(got, "![ERD: Main ERD](main.svg)") || !strings.Contains(got, "[orders](../../tables/order.md)") || !strings.Contains(got, "Tables used in this diagram") {
		t.Fatalf("ERD page is incomplete:\n%s", got)
	}
	if got := artifacts["diagrams/dfd/main.md"].Content; !strings.Contains(got, "![DFD: Main DFD](main.svg)") || !strings.Contains(got, "[orders](../../tables/order.md)") || !strings.Contains(got, "Create order") || !strings.Contains(got, "## Data flows") {
		t.Fatalf("DFD page is incomplete:\n%s", got)
	}
	for _, path := range []string{"tables/order.md", "vocabulary.md", "domains.md", "relationships.md", "dfd-processes-and-flows.md", "crud-assignments.md", "diagrams/erd/main.md", "diagrams/dfd/main.md"} {
		if !strings.Contains(artifacts[path].Content, "[Index](") {
			t.Errorf("%s has no index navigation", path)
		}
	}
	if got := artifacts["crud-assignments.md"].Content; !strings.Contains(got, "[orders](tables/order.md)") || !strings.Contains(got, "![CRUD matrix](diagrams/crud-matrix.svg)") {
		t.Fatalf("CRUD page does not link to its model:\n%s", got)
	}
}

func TestGenerateMarkdownSVGUsesOriginalLayoutAndEscapesXML(t *testing.T) {
	state := validExportState()
	state["placements"].([]any)[0].(map[string]any)["x"] = 725.0
	state["placements"].([]any)[0].(map[string]any)["y"] = -85.0
	state["seeds"].([]any)[0].(map[string]any)["description"] = `Orders <live> & archived`
	state["annotations"] = []any{map[string]any{
		"id": "note-1", "canvasType": "erd", "canvasId": "main", "kind": "sticky_note", "x": 1050.0, "y": -120.0, "width": 220.0, "height": 140.0,
		"text": `Check <owner> & rules`, "color": "#854d0e", "fill": "#fef9c3", "strokeWidth": 2.0, "layer": "foreground",
	}}
	result, err := GenerateMarkdown(canonicalExportFixture(t, state), MarkdownOptions{NameMode: "business", ModelCardContent: "description"})
	if err != nil {
		t.Fatal(err)
	}
	artifacts := artifactsByPath(result.Artifacts)
	erd := artifacts["diagrams/erd/main.svg"].Content
	for _, want := range []string{`x="725.000"`, `y="-85.000"`, `Orders &lt;live&gt; &amp; archived`, `Check &lt;owner&gt; &amp; rules`, `viewBox="`} {
		if !strings.Contains(erd, want) {
			t.Errorf("ERD SVG missing %q:\n%s", want, erd)
		}
	}
	dfd := artifacts["diagrams/dfd/main.svg"].Content
	for _, want := range []string{`x="84.000"`, `y="124.000"`, `id="dfd-flow-create-flow"`, `id="group-group-data"`} {
		if !strings.Contains(dfd, want) {
			t.Errorf("DFD SVG missing original layout %q:\n%s", want, dfd)
		}
	}
	crud := artifacts["diagrams/crud-matrix.svg"].Content
	if !strings.Contains(crud, ">CR<") || !strings.Contains(crud, "Create order") {
		t.Fatalf("CRUD SVG is incomplete:\n%s", crud)
	}
	for _, path := range []string{"diagrams/erd/main.svg", "diagrams/dfd/main.svg", "diagrams/crud-matrix.svg"} {
		decoder := xml.NewDecoder(strings.NewReader(artifacts[path].Content))
		for {
			_, decodeErr := decoder.Token()
			if decodeErr == io.EOF {
				break
			}
			if decodeErr != nil {
				t.Fatalf("%s is not valid standalone XML: %v", path, decodeErr)
			}
		}
	}
}

func TestGenerateMarkdownSVGPreservesGroupedFreehandStrokes(t *testing.T) {
	state := validExportState()
	state["annotations"] = []any{map[string]any{
		"id": "pen-1", "canvasType": "erd", "canvasId": "main", "kind": "freehand_stroke",
		"strokes": []any{
			map[string]any{"points": []any{map[string]any{"x": 10.0, "y": 20.0}, map[string]any{"x": 30.0, "y": 40.0}}},
			map[string]any{"points": []any{map[string]any{"x": 50.0, "y": 60.0}, map[string]any{"x": 70.0, "y": 80.0}}},
		},
		"color": "#334155", "strokeWidth": 3.0, "layer": "annotation",
	}}
	result, err := GenerateMarkdown(canonicalExportFixture(t, state), MarkdownOptions{NameMode: "business", ModelCardContent: "description"})
	if err != nil {
		t.Fatal(err)
	}
	erd := artifactsByPath(result.Artifacts)["diagrams/erd/main.svg"].Content
	if !strings.Contains(erd, `d="M10.000 20.000 L30.000 40.000 M50.000 60.000 L70.000 80.000"`) {
		t.Fatalf("grouped freehand strokes were not preserved:\n%s", erd)
	}
}

func TestGenerateSQLBlocksMissingPhysicalNamesAndDomains(t *testing.T) {
	state := validExportState()
	state["seeds"].([]any)[0].(map[string]any)["names"] = map[string]any{"business": "Order", "system": "Order", "physical": ""}
	field := state["seeds"].([]any)[0].(map[string]any)["fields"].([]any)[0].(map[string]any)
	field["names"] = map[string]any{"business": "Order ID", "system": "orderId", "physical": ""}
	field["domainId"] = ""
	result, err := GenerateSQL(canonicalExportFixture(t, state), SQLExportOptions{Dialects: []string{"postgresql"}})
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Artifacts) != 0 {
		t.Fatalf("blocking diagnostics produced artifacts: %#v", result.Artifacts)
	}
	codes := diagnosticCodes(result.Diagnostics)
	for _, code := range []string{"sql.table.physical_name_missing", "sql.column.physical_name_missing", "sql.column.domain_missing"} {
		if !codes[code] {
			t.Errorf("missing diagnostic %s: %#v", code, result.Diagnostics)
		}
	}
	for _, item := range result.Diagnostics {
		if item.Severity == "error" && item.Target.Kind == "" {
			t.Errorf("diagnostic has no jump target: %#v", item)
		}
	}
}

func TestGenerateSQLRendersRequiredDialects(t *testing.T) {
	input := canonicalExportFixture(t, validExportState())
	tests := []struct {
		dialect string
		want    []string
	}{
		{"mysql", []string{"CREATE TABLE `orders`", "`order_id` INT AUTO_INCREMENT NOT NULL", "PRIMARY KEY (`order_id`)"}},
		{"postgresql", []string{`CREATE TABLE "orders"`, `"order_id" INTEGER GENERATED BY DEFAULT AS IDENTITY NOT NULL`, `PRIMARY KEY ("order_id")`}},
		{"sqlite", []string{`CREATE TABLE "orders"`, `"order_id" INTEGER PRIMARY KEY AUTOINCREMENT`}},
	}
	for _, test := range tests {
		t.Run(test.dialect, func(t *testing.T) {
			result, err := GenerateSQL(input, SQLExportOptions{Dialects: []string{test.dialect}})
			if err != nil {
				t.Fatal(err)
			}
			if hasErrorDiagnostics(result.Diagnostics) || len(result.Artifacts) != 1 {
				t.Fatalf("unexpected export result: %#v", result)
			}
			for _, want := range test.want {
				if !strings.Contains(result.Artifacts[0].Content, want) {
					t.Errorf("%s DDL missing %q:\n%s", test.dialect, want, result.Artifacts[0].Content)
				}
			}
		})
	}
}

func TestGenerateSQLRendersDuckDBAndBigQueryWithoutAutoIncrement(t *testing.T) {
	state := validExportState()
	state["seeds"].([]any)[0].(map[string]any)["fields"].([]any)[0].(map[string]any)["valueGeneration"] = ""
	input := canonicalExportFixture(t, state)
	tests := []struct{ dialect, want string }{
		{"duckdb", `"order_id" INTEGER NOT NULL`},
		{"bigquery", "PRIMARY KEY (`order_id`) NOT ENFORCED"},
	}
	for _, test := range tests {
		t.Run(test.dialect, func(t *testing.T) {
			result, err := GenerateSQL(input, SQLExportOptions{Dialects: []string{test.dialect}})
			if err != nil {
				t.Fatal(err)
			}
			if hasErrorDiagnostics(result.Diagnostics) || len(result.Artifacts) != 1 || !strings.Contains(result.Artifacts[0].Content, test.want) {
				t.Fatalf("unexpected %s result: %#v", test.dialect, result)
			}
		})
	}
}

func TestGenerateSQLRejectsCompositionCycle(t *testing.T) {
	state := validExportState()
	state["seeds"] = append(state["seeds"].([]any), map[string]any{
		"id": "line", "title": "Line", "names": map[string]any{"business": "Line", "system": "Line", "physical": "lines"}, "fields": []any{
			map[string]any{"id": "line-id", "name": "id", "names": map[string]any{"business": "Line ID", "system": "lineId", "physical": "line_id"}, "primaryKey": true, "required": true, "domainId": "integer-domain"},
		},
	})
	state["relationships"] = []any{
		map[string]any{"id": "order-lines", "name": "order", "sourceId": "order", "targetId": "line", "sourceMultiplicity": "1", "targetMultiplicity": "1..*", "direction": "source-to-target", "kind": "composition", "onDelete": "cascade"},
		map[string]any{"id": "line-order", "name": "line", "sourceId": "line", "targetId": "order", "sourceMultiplicity": "1", "targetMultiplicity": "1", "direction": "source-to-target", "kind": "composition", "onDelete": "cascade"},
	}
	result, err := GenerateSQL(canonicalExportFixture(t, state), SQLExportOptions{Dialects: []string{"postgresql"}})
	if err != nil {
		t.Fatal(err)
	}
	if !diagnosticCodes(result.Diagnostics)["sql.composition.cycle"] || len(result.Artifacts) != 0 {
		t.Fatalf("composition cycle did not block output: %#v", result)
	}
}

func TestGenerateSQLProjectsForeignKeyAndManyToManyJoinTable(t *testing.T) {
	state := validExportState()
	addCustomerModel(state)
	state["seeds"].([]any)[0].(map[string]any)["fields"].([]any)[0].(map[string]any)["valueGeneration"] = ""
	state["relationships"] = []any{
		map[string]any{"id": "customer-orders", "name": "customer", "sourceId": "customer", "targetId": "order", "sourceMultiplicity": "1", "targetMultiplicity": "0..*", "direction": "source-to-target", "kind": "foreign-key", "onDelete": "restrict"},
		map[string]any{"id": "order-customers", "name": "order_customers", "sourceId": "order", "targetId": "customer", "sourceMultiplicity": "0..*", "targetMultiplicity": "0..*", "direction": "source-to-target", "kind": "foreign-key", "onDelete": "no_action"},
	}
	state["relationshipReferences"] = []any{
		map[string]any{"id": "customer-orders-reference", "relationshipId": "customer-orders", "foreignKey": true},
		map[string]any{"id": "order-customers-reference", "relationshipId": "order-customers", "foreignKey": true},
	}
	result, err := GenerateSQL(canonicalExportFixture(t, state), SQLExportOptions{Dialects: []string{"postgresql"}})
	if err != nil {
		t.Fatal(err)
	}
	if hasErrorDiagnostics(result.Diagnostics) || len(result.Artifacts) != 1 {
		t.Fatalf("unexpected diagnostics: %#v", result.Diagnostics)
	}
	ddl := result.Artifacts[0].Content
	for _, want := range []string{
		`"customer_customer_id" INTEGER NOT NULL`,
		`FOREIGN KEY ("customer_customer_id") REFERENCES "customers" ("customer_id") ON DELETE RESTRICT`,
		`CREATE TABLE "order_customers"`,
		`PRIMARY KEY ("orders_order_id", "customers_customer_id")`,
	} {
		if !strings.Contains(ddl, want) {
			t.Errorf("DDL missing %q:\n%s", want, ddl)
		}
	}
}

func TestGenerateSQLDefersRelationshipsForServerDialects(t *testing.T) {
	state := validExportState()
	addCustomerModel(state)
	state["seeds"].([]any)[0].(map[string]any)["fields"].([]any)[0].(map[string]any)["valueGeneration"] = ""
	state["relationships"] = []any{
		map[string]any{"id": "customer-orders", "name": "customer", "sourceId": "customer", "targetId": "order", "sourceMultiplicity": "1", "targetMultiplicity": "0..*", "direction": "source-to-target", "kind": "foreign-key", "onDelete": "no_action"},
	}
	state["relationshipReferences"] = []any{map[string]any{"id": "customer-orders-reference", "relationshipId": "customer-orders", "foreignKey": true}}
	input := canonicalExportFixture(t, state)
	tests := []struct {
		dialect string
		want    string
	}{
		{"mysql", "ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_customer` FOREIGN KEY"},
		{"postgresql", `ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_customer" FOREIGN KEY`},
		{"bigquery", "ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_customer_id`) REFERENCES `customers` (`customer_id`) NOT ENFORCED"},
	}
	for _, test := range tests {
		t.Run(test.dialect, func(t *testing.T) {
			result, err := GenerateSQL(input, SQLExportOptions{Dialects: []string{test.dialect}})
			if err != nil || hasErrorDiagnostics(result.Diagnostics) || len(result.Artifacts) != 1 {
				t.Fatalf("unexpected %s result: %#v, %v", test.dialect, result, err)
			}
			ddl := result.Artifacts[0].Content
			if !strings.Contains(ddl, test.want) || strings.Index(ddl, "ALTER TABLE") < strings.LastIndex(ddl, "CREATE TABLE") {
				t.Fatalf("foreign key was not deferred for %s:\n%s", test.dialect, ddl)
			}
		})
	}
}

func TestGenerateSQLProjectsInheritedParentColumns(t *testing.T) {
	state := validExportState()
	addCustomerModel(state)
	state["seeds"].([]any)[0].(map[string]any)["fields"].([]any)[0].(map[string]any)["valueGeneration"] = ""
	state["relationships"] = []any{
		map[string]any{"id": "order-inherits-customer", "name": "base", "sourceId": "order", "targetId": "customer", "sourceMultiplicity": "1", "targetMultiplicity": "1", "direction": "source-to-target", "kind": "inherit"},
	}
	state["relationshipReferences"] = []any{map[string]any{"id": "order-inherits-customer-reference", "relationshipId": "order-inherits-customer"}}
	result, err := GenerateSQL(canonicalExportFixture(t, state), SQLExportOptions{Dialects: []string{"postgresql"}})
	if err != nil {
		t.Fatal(err)
	}
	if hasErrorDiagnostics(result.Diagnostics) || len(result.Artifacts) != 1 {
		t.Fatalf("unexpected diagnostics: %#v", result.Diagnostics)
	}
	ddl := result.Artifacts[0].Content
	ordersStart := strings.Index(ddl, `CREATE TABLE "orders"`)
	if ordersStart < 0 || !strings.Contains(ddl[ordersStart:], `"customer_id" INTEGER NOT NULL`) {
		t.Fatalf("inherited column missing:\n%s", ddl)
	}
}

func TestGeneratedJSONWireExposesMarkdownAndSQLResults(t *testing.T) {
	input := canonicalExportFixture(t, validExportState())
	markdownJSON, err := GenerateMarkdownJSON(input, []byte(`{"nameMode":"physical","modelCardContent":"primary_keys","generatedAt":"2026-07-17T00:00:00Z","sourceSnapshotRevision":"wire"}`))
	if err != nil {
		t.Fatal(err)
	}
	var markdown ExportResult
	if err := json.Unmarshal(markdownJSON, &markdown); err != nil {
		t.Fatal(err)
	}
	if len(markdown.Artifacts) != 13 || markdown.Artifacts[0].Path == "" {
		t.Fatalf("unexpected Markdown wire result: %#v", markdown)
	}
	sqlJSON, err := GenerateSQLJSON(input, []byte(`{"dialects":["postgresql"]}`))
	if err != nil {
		t.Fatal(err)
	}
	var sql ExportResult
	if err := json.Unmarshal(sqlJSON, &sql); err != nil {
		t.Fatal(err)
	}
	if len(sql.Artifacts) != 1 || sql.Artifacts[0].Path != "postgresql.sql" {
		t.Fatalf("unexpected SQL wire result: %#v", sql)
	}
}

func TestGenerateSQLIsDeterministicAndAnnotatesDialectDiagnostics(t *testing.T) {
	state := validExportState()
	addCustomerModel(state)
	state["seeds"].([]any)[0].(map[string]any)["fields"].([]any)[0].(map[string]any)["valueGeneration"] = ""
	state["relationships"] = []any{
		map[string]any{"id": "customer-orders", "name": "customer", "sourceId": "customer", "targetId": "order", "sourceMultiplicity": "1", "targetMultiplicity": "1..*", "direction": "source-to-target", "kind": "composition", "onDelete": "restrict"},
	}
	state["relationshipReferences"] = []any{map[string]any{"id": "customer-orders-reference", "relationshipId": "customer-orders", "foreignKey": true}}
	input := canonicalExportFixture(t, state)
	options := []byte(`{"dialects":["duckdb","postgresql"]}`)
	first, err := GenerateSQLJSON(input, options)
	if err != nil {
		t.Fatal(err)
	}
	second, err := GenerateSQLJSON(input, options)
	if err != nil {
		t.Fatal(err)
	}
	if string(first) != string(second) {
		t.Fatalf("SQL result is not deterministic:\n%s\n%s", first, second)
	}
	var result ExportResult
	if err := json.Unmarshal(first, &result); err != nil {
		t.Fatal(err)
	}
	if !hasErrorDiagnostics(result.Diagnostics) || len(result.Artifacts) != 0 {
		t.Fatalf("DuckDB composition cascade should block all selected artifacts: %#v", result)
	}
	found := false
	for _, item := range result.Diagnostics {
		if item.Code == "sql.foreign_key.delete_action_unsupported" && item.ArtifactID == "duckdb.sql" && item.Target.RelationshipID == "customer-orders" {
			found = true
		}
	}
	if !found {
		t.Fatalf("dialect diagnostic metadata is incomplete: %#v", result.Diagnostics)
	}

	postgres, err := GenerateSQL(input, SQLExportOptions{Dialects: []string{"postgresql"}})
	if err != nil || hasErrorDiagnostics(postgres.Diagnostics) || len(postgres.Artifacts) != 1 || !strings.Contains(postgres.Artifacts[0].Content, "ON DELETE CASCADE") {
		t.Fatalf("composition cascade was not generated for PostgreSQL: %#v, %v", postgres, err)
	}
}

func canonicalExportFixture(t *testing.T, state map[string]any) []byte {
	t.Helper()
	projectJSON, err := json.Marshal(state)
	if err != nil {
		t.Fatal(err)
	}
	canonical, err := json.Marshal(map[string]any{
		"formatVersion": 1,
		"projectId":     "demo-project",
		"documents":     map[string]string{"project.json": string(projectJSON)},
	})
	if err != nil {
		t.Fatal(err)
	}
	return canonical
}

func validExportState() map[string]any {
	return map[string]any{
		"canvases":   []any{map[string]any{"id": "main", "name": "Main ERD"}},
		"placements": []any{map[string]any{"canvasId": "main", "seedId": "order", "x": 120.0, "y": 90.0, "accessMode": "owner"}},
		"seeds": []any{map[string]any{
			"id": "order", "title": "Order", "names": map[string]any{"business": "Order", "system": "Order", "physical": "orders"}, "description": "Order aggregate", "role": "transaction",
			"fields": []any{
				map[string]any{"id": "order-id", "name": "id", "names": map[string]any{"business": "Order ID", "system": "orderId", "physical": "order_id"}, "primaryKey": true, "required": true, "domainId": "integer-domain", "valueGeneration": "auto_increment"},
				map[string]any{"id": "order-label", "name": "label", "names": map[string]any{"business": "Label", "system": "label", "physical": "label"}, "important": true, "domainId": "label-domain"},
			},
		}},
		"domains": []any{
			map[string]any{"id": "integer-domain", "name": "Integer", "names": map[string]any{"business": "Integer", "system": "Integer", "physical": "integer"}, "categoryId": "primitive", "shape": "primitive", "primitiveType": "integer", "bits": 32, "components": []any{}},
			map[string]any{"id": "label-domain", "name": "Label", "names": map[string]any{"business": "Label", "system": "Label", "physical": "label"}, "categoryId": "primitive", "shape": "primitive", "primitiveType": "varchar", "length": 80, "components": []any{}},
		},
		"relationships":          []any{},
		"relationshipReferences": []any{},
		"namingPolicy":           map[string]any{"fieldJoinMode": "separator", "fieldSeparator": "_"},
		"vocabularyEntries":      []any{map[string]any{"id": "order-vocab", "businessName": "Order | Purchase", "systemName": "Order", "physicalName": "order", "meaning": "Commercial order", "aliases": []string{"Purchase"}}},
		"dfd": map[string]any{
			"canvases": []any{map[string]any{"id": "main", "name": "Main DFD"}},
			"nodes": []any{
				map[string]any{"id": "create-node", "definitionId": "create-order", "canvasId": "main", "kind": "process", "name": "Create order", "processKind": "online", "x": 80.0, "y": 120.0},
				map[string]any{"id": "order-node", "definitionId": "order-data", "canvasId": "main", "kind": "model", "name": "Order", "modelId": "order", "x": 420.0, "y": 120.0},
			},
			"flows":      []any{map[string]any{"id": "create-flow", "canvasId": "main", "sourceId": "create-node", "destinationId": "order-node", "label": "Order", "crudAssignments": []any{map[string]any{"processUnitId": "create-order", "modelId": "order", "operations": []string{"C", "R"}}}}},
			"groups":     []any{map[string]any{"id": "group-data", "canvasId": "main", "kind": "data_entity", "memberIds": []string{"order-node"}}},
			"crudMatrix": map[string]any{"orientation": "processes_rows", "processOrder": []string{"create-order"}, "modelOrder": []string{"order"}},
		},
		"annotations": []any{},
	}
}

func addCustomerModel(state map[string]any) {
	state["seeds"] = append(state["seeds"].([]any), map[string]any{
		"id": "customer", "title": "Customer", "names": map[string]any{"business": "Customer", "system": "Customer", "physical": "customers"}, "description": "Customer master", "role": "master",
		"fields": []any{
			map[string]any{"id": "customer-id", "name": "id", "names": map[string]any{"business": "Customer ID", "system": "customerId", "physical": "customer_id"}, "primaryKey": true, "required": true, "domainId": "integer-domain"},
		},
	})
}

func artifactsByPath(artifacts []ExportArtifact) map[string]ExportArtifact {
	result := make(map[string]ExportArtifact, len(artifacts))
	for _, artifact := range artifacts {
		result[artifact.Path] = artifact
	}
	return result
}

func diagnosticCodes(diagnostics []ExportDiagnostic) map[string]bool {
	result := make(map[string]bool, len(diagnostics))
	for _, item := range diagnostics {
		result[item.Code] = true
	}
	return result
}
