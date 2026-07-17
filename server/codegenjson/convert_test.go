package codegenjson

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestConvertBuildsDeterministicSemanticJSON(t *testing.T) {
	state := map[string]any{
		"seeds": []any{
			map[string]any{
				"id":          "order",
				"title":       "Order",
				"names":       map[string]any{"business": "Order", "system": "Order", "physical": "orders"},
				"description": "Order aggregate",
				"role":        "transaction",
				"x":           120,
				"y":           240,
				"fields": []any{
					map[string]any{
						"id":            "order-key",
						"name":          "order",
						"names":         map[string]any{"business": "Order", "system": "order", "physical": "order"},
						"primaryKey":    true,
						"important":     true,
						"domainId":      "order-key-domain",
						"useDomainName": false,
					},
				},
			},
		},
		"domains": []any{
			map[string]any{
				"id":         "order-key-domain",
				"name":       "Order Key",
				"categoryId": "user-defined",
				"shape":      "composite",
				"components": []any{
					map[string]any{"id": "tenant", "name": "Tenant", "domainId": "uuid-domain", "required": true},
					map[string]any{"id": "number", "name": "Number", "domainId": "integer-domain", "required": true},
				},
			},
			map[string]any{"id": "uuid-domain", "name": "UUID", "categoryId": "primitive", "shape": "primitive", "primitiveType": "uuid", "components": []any{}},
			map[string]any{"id": "integer-domain", "name": "Integer", "categoryId": "primitive", "shape": "primitive", "primitiveType": "integer", "components": []any{}},
		},
		"relationships":          []any{},
		"relationshipReferences": []any{},
		"vocabularyEntries":      []any{},
		"dfd": map[string]any{
			"nodes": []any{
				map[string]any{"id": "node-order", "definitionId": "order", "canvasId": "dfd", "kind": "model", "modelId": "order", "name": "Order", "x": 10, "y": 20},
				map[string]any{"id": "node-create", "definitionId": "create-order", "canvasId": "dfd", "kind": "process", "processKind": "batch", "name": "Create order", "x": 30, "y": 40},
			},
			"flows": []any{
				map[string]any{
					"id": "create-order-flow", "canvasId": "dfd", "sourceId": "node-create", "destinationId": "node-order",
					"crudAssignments": []any{map[string]any{"processUnitId": "create-order", "modelId": "order", "operations": []string{"R", "C"}}},
				},
			},
		},
		"annotations": []any{map[string]any{"id": "ignored", "text": "not exported"}},
	}
	projectJSON, err := json.Marshal(state)
	if err != nil {
		t.Fatal(err)
	}
	canonical, err := json.Marshal(map[string]any{
		"formatVersion": 1,
		"projectId":     "demo",
		"documents":     map[string]string{"project.json": string(projectJSON)},
	})
	if err != nil {
		t.Fatal(err)
	}

	first, err := Convert(canonical)
	if err != nil {
		t.Fatal(err)
	}
	second, err := Convert(canonical)
	if err != nil {
		t.Fatal(err)
	}
	if string(first) != string(second) {
		t.Fatal("conversion output is not deterministic")
	}
	if strings.Contains(string(first), `"annotations"`) || strings.Contains(string(first), `"x"`) || strings.Contains(string(first), `"y"`) {
		t.Fatalf("editor-only state leaked into export: %s", first)
	}

	var got ExchangeDocument
	if err := json.Unmarshal(first, &got); err != nil {
		t.Fatal(err)
	}
	if got.Schema != SchemaID || got.Project.ID != "demo" || len(got.Models) != 1 {
		t.Fatalf("unexpected exchange header: %#v", got)
	}
	columns := got.Models[0].PhysicalColumns
	if len(columns) != 2 || columns[0].PrimitiveType != "integer" || columns[1].PrimitiveType != "uuid" {
		t.Fatalf("unexpected composite expansion: %#v", columns)
	}
	if len(got.Processes) != 1 || got.DataFlows[0].SourceID != "create-order" || got.DataFlows[0].DestinationID != "order" {
		t.Fatalf("unexpected DFD projection: %#v %#v", got.Processes, got.DataFlows)
	}
	if operations := got.CRUDAssignments[0].Operations; len(operations) != 2 || operations[0] != "C" || operations[1] != "R" {
		t.Fatalf("unexpected CRUD operations: %#v", operations)
	}
}

func TestConvertRejectsMissingProjectDocument(t *testing.T) {
	_, err := Convert([]byte(`{"formatVersion":1,"projectId":"demo","documents":{}}`))
	if err == nil || !strings.Contains(err.Error(), "project.json is missing") {
		t.Fatalf("got %v", err)
	}
}
