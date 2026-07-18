package codegenjson

import (
	"fmt"
	"sort"
	"strings"
)

const drawIOMediaType = "application/vnd.jgraph.mxfile; charset=utf-8"

// GenerateDrawIO renders every project diagram as an editable sheet in one
// draw.io document.
func GenerateDrawIO(input []byte, options DiagramExportOptions) (ExportResult, error) {
	_, state, err := decodeProject(input)
	if err != nil {
		return ExportResult{}, err
	}
	presentation := normalizeMarkdownOptions(MarkdownOptions{NameMode: options.NameMode, ModelCardContent: options.ModelCardContent})
	sheets := make([]string, 0, len(state.Canvases)+len(state.DFD.Canvases)+1)
	for _, canvas := range erdCanvases(state) {
		sheets = append(sheets, renderERDDrawIO(canvas, state, presentation))
	}
	for _, canvas := range dfdCanvases(state) {
		sheets = append(sheets, renderDFDDrawIO(canvas, state, presentation))
	}
	sheets = append(sheets, renderCRUDDrawIO(state, presentation, options.CRUDOrientation))
	artifact := drawIOArtifact("diagrams.drawio", wrapDrawIO(sheets))
	return ExportResult{Artifacts: []ExportArtifact{artifact}, Diagnostics: []ExportDiagnostic{}}, nil
}

func drawIOArtifact(path, content string) ExportArtifact {
	return ExportArtifact{Path: path, MediaType: drawIOMediaType, Content: content}
}

type drawIOWriter struct {
	body strings.Builder
}

func newDrawIOWriter() *drawIOWriter {
	w := &drawIOWriter{}
	w.body.WriteString(`<mxCell id="0"/><mxCell id="1" parent="0"/>`)
	return w
}

func (w *drawIOWriter) vertex(id, value, style string, x, y, width, height float64) {
	fmt.Fprintf(&w.body, `<mxCell id="%s" value="%s" style="%s" vertex="1" parent="1"><mxGeometry x="%s" y="%s" width="%s" height="%s" as="geometry"/></mxCell>`, xmlAttr(id), drawIOLabelAttr(value), xmlAttr(style), number(x), number(y), number(width), number(height))
}

func (w *drawIOWriter) edge(id, value, style, source, target string) {
	fmt.Fprintf(&w.body, `<mxCell id="%s" value="%s" style="%s" edge="1" parent="1" source="%s" target="%s"><mxGeometry relative="1" as="geometry"/></mxCell>`, xmlAttr(id), drawIOLabelAttr(value), xmlAttr(style), xmlAttr(source), xmlAttr(target))
}

func drawIOLabelAttr(value string) string {
	return strings.ReplaceAll(xmlAttr(value), "\n", "&#xa;")
}

func (w *drawIOWriter) sheet(name, id string) string {
	return `<diagram id="` + xmlAttr(id) + `" name="` + xmlAttr(name) + `"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1654" pageHeight="1169" math="0" shadow="0"><root>` + w.body.String() + `</root></mxGraphModel></diagram>`
}

func wrapDrawIO(sheets []string) string {
	return `<?xml version="1.0" encoding="UTF-8"?>` +
		`<mxfile host="ERDSketch" agent="ERDSketch" version="1.0">` + strings.Join(sheets, "") + `</mxfile>`
}

func renderERDDrawIO(canvas SourceERDCanvas, state ProjectState, options MarkdownOptions) string {
	w := newDrawIOWriter()
	placed := placedModels(canvas.ID, state, options)
	visible := make(map[string]bool, len(placed))
	for _, item := range placed {
		visible[item.model.ID] = true
		fill, stroke := erdRoleColors(item.model.Role)
		lines := make([]string, 0)
		if options.ModelCardContent == "description" {
			lines = wrapText(emptyLabel(item.model.Description), 38, 5)
		} else {
			for _, field := range item.model.Fields {
				if field.PrimaryKey || field.Important {
					prefix := "• "
					if field.PrimaryKey {
						prefix = "PK  "
					}
					lines = append(lines, prefix+displayName(field.Name, field.Names, options.NameMode))
				}
			}
			if len(lines) == 0 {
				lines = []string{"No primary or important fields"}
			}
		}
		value := strings.ToUpper(emptyLabel(item.model.Role)) + "\n" + displayName(item.model.Title, item.model.Names, options.NameMode)
		if len(lines) > 0 {
			value += "\n────────────\n" + strings.Join(lines, "\n")
		}
		style := fmt.Sprintf("rounded=1;whiteSpace=wrap;html=0;align=left;verticalAlign=top;spacing=14;fontSize=13;fontColor=#0f172a;fillColor=%s;strokeColor=%s;strokeWidth=2;rotation=%s;", fill, stroke, number(item.model.Rotation))
		w.vertex("model-"+item.model.ID, value, style, item.x, item.y, erdCardWidth, item.height)
	}
	hidden := make(map[string]bool)
	for _, reference := range state.RelationshipReferences {
		hidden[reference.RelationshipID] = len(reference.HiddenOnModelIDs) > 0
	}
	for _, relationship := range state.Relationships {
		if !visible[relationship.SourceID] || !visible[relationship.TargetID] || hidden[relationship.ID] {
			continue
		}
		style := "edgeStyle=orthogonalEdgeStyle;rounded=1;html=0;strokeColor=#334155;strokeWidth=2;"
		if relationship.Kind == "label" {
			style += "startArrow=none;endArrow=none;"
		} else if relationship.Direction == "target-to-source" {
			style += "startArrow=classic;startFill=0;endArrow=none;"
		} else {
			style += "startArrow=none;endArrow=classic;endFill=0;"
		}
		if relationship.Kind == "composition" {
			style += "startArrow=diamond;startFill=1;"
		}
		label := relationship.Name
		if relationship.Kind != "label" {
			label = relationship.SourceMultiplicity + "  " + label + "  " + relationship.TargetMultiplicity
		}
		w.edge("relationship-"+relationship.ID, label, style, "model-"+relationship.SourceID, "model-"+relationship.TargetID)
	}
	appendDrawIOAnnotations(w, resolveERDAnnotations(canvasAnnotations(state.Annotations, "erd", canvas.ID), placedModelMap(placed)))
	return w.sheet("ERD — "+emptyLabel(canvas.Name), "erd-"+canvas.ID)
}

func placedModelMap(items []erdPlacedModel) map[string]erdPlacedModel {
	result := make(map[string]erdPlacedModel, len(items))
	for _, item := range items {
		result[item.model.ID] = item
	}
	return result
}

func renderDFDDrawIO(canvas SourceDFDCanvas, state ProjectState, options MarkdownOptions) string {
	w := newDrawIOWriter()
	nodes := make(map[string]SourceDFDNode)
	for _, node := range state.DFD.Nodes {
		if node.CanvasID == canvas.ID {
			nodes[node.ID] = node
		}
	}
	groups := make(map[string]dfdBox)
	for _, group := range state.DFD.Groups {
		if group.CanvasID != canvas.ID {
			continue
		}
		if box, ok := dfdGroupBox(group, nodes); ok {
			groups[group.ID] = box
			w.vertex("group-"+group.ID, strings.ToUpper(strings.ReplaceAll(group.Kind, "_", " "))+" GROUP", "rounded=1;whiteSpace=wrap;html=0;verticalAlign=top;align=left;spacing=8;dashed=1;dashPattern=8 7;fillOpacity=15;strokeColor=#64748b;strokeWidth=2;", box.x, box.y, box.width, box.height)
		}
	}
	models := modelsByID(state.Seeds)
	ids := make([]string, 0, len(nodes))
	for id := range nodes {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	for _, id := range ids {
		node := nodes[id]
		size := dfdNodeSize(node.Kind)
		name, detail := node.Name, node.Description
		if model := models[node.ModelID]; model.ID != "" {
			name, detail = displayName(model.Title, model.Names, options.NameMode), model.Description
			if options.ModelCardContent == "primary_keys" {
				fields := make([]string, 0, 3)
				for _, field := range model.Fields {
					if field.PrimaryKey || field.Important {
						fields = append(fields, displayName(field.Name, field.Names, options.NameMode))
						if len(fields) == 3 {
							break
						}
					}
				}
				detail = strings.Join(fields, "\n")
			}
		} else if options.ModelCardContent == "primary_keys" {
			detail = firstNonEmpty(node.Format, node.ProcessKind, node.IntermediateKind)
		}
		style := dfdDrawIOStyle(node)
		value := name
		if strings.TrimSpace(detail) != "" {
			value += "\n" + detail
		}
		w.vertex("node-"+node.ID, value, style, node.X, node.Y, size.width, size.height)
	}
	for _, flow := range state.DFD.Flows {
		if flow.CanvasID != canvas.ID {
			continue
		}
		source, sourceOK := drawIOEndpointID(flow.SourceID, nodes, groups)
		target, targetOK := drawIOEndpointID(flow.DestinationID, nodes, groups)
		if !sourceOK || !targetOK {
			continue
		}
		style := "edgeStyle=orthogonalEdgeStyle;rounded=1;html=0;strokeColor=#334155;strokeWidth=2;endArrow=block;endFill=1;"
		if flow.Bidirectional {
			style += "startArrow=block;startFill=1;"
		}
		label := flow.Label
		if flow.Protocol != "" {
			label += "\n" + flow.Protocol
		}
		w.edge("flow-"+flow.ID, label, style, source, target)
	}
	appendDrawIOAnnotations(w, resolveDFDAnnotations(canvasAnnotations(state.Annotations, "dfd", canvas.ID), nodes, groups))
	return w.sheet("DFD — "+emptyLabel(canvas.Name), "dfd-"+canvas.ID)
}

func dfdDrawIOStyle(node SourceDFDNode) string {
	base := "whiteSpace=wrap;html=0;strokeWidth=2;fontColor=#0f172a;"
	switch node.Kind {
	case "model":
		return base + "shape=datastore;fillColor=#fffbeb;strokeColor=#1e293b;"
	case "external":
		return base + "shape=mxgraph.flowchart.direct_data;fillColor=#ffffff;strokeColor=#1e293b;"
	case "intermediate":
		if node.IntermediateKind == "queue" {
			return base + "rounded=1;arcSize=35;fillColor=#ecfeff;strokeColor=#0e7490;"
		}
		return base + "shape=mxgraph.flowchart.stored_data;fillColor=#ffffff;strokeColor=#1e293b;"
	default:
		return base + "shape=process;fillColor=#ffffff;strokeColor=#1e293b;"
	}
}

func drawIOEndpointID(id string, nodes map[string]SourceDFDNode, groups map[string]dfdBox) (string, bool) {
	if _, ok := nodes[id]; ok {
		return "node-" + id, true
	}
	if _, ok := groups[id]; ok {
		return "group-" + id, true
	}
	return "", false
}

func renderCRUDDrawIO(state ProjectState, options MarkdownOptions, orientation string) string {
	w := newDrawIOWriter()
	processes := orderCRUDItems(crudProcesses(state), state.DFD.CRUDMatrix.ProcessOrder)
	models := make([]crudItem, 0, len(state.Seeds))
	for _, model := range state.Seeds {
		models = append(models, crudItem{model.ID, displayName(model.Title, model.Names, options.NameMode)})
	}
	models = orderCRUDItems(models, state.DFD.CRUDMatrix.ModelOrder)
	if orientation != "processes_rows" && orientation != "models_rows" {
		orientation = state.DFD.CRUDMatrix.Orientation
	}
	rows, columns, processRows := processes, models, true
	if orientation == "models_rows" {
		rows, columns, processRows = models, processes, false
	}
	const rowHeader, cellWidth, rowHeight, headerHeight = 230.0, 80.0, 42.0, 176.0
	w.vertex("crud-corner", "", "fillColor=#e2e8f0;strokeColor=#cbd5e1;", 0, 0, rowHeader, headerHeight)
	for columnIndex, column := range columns {
		w.vertex(fmt.Sprintf("crud-column-%d", columnIndex), column.label, "whiteSpace=wrap;html=0;horizontal=0;fontStyle=1;fillColor=#f1f5f9;strokeColor=#cbd5e1;", rowHeader+float64(columnIndex)*cellWidth, 0, cellWidth, headerHeight)
	}
	cells := crudAssignmentCells(state)
	for rowIndex, row := range rows {
		y := headerHeight + float64(rowIndex)*rowHeight
		w.vertex(fmt.Sprintf("crud-row-%d", rowIndex), row.label, "whiteSpace=wrap;html=0;align=left;spacingLeft=10;fontStyle=1;fillColor=#f8fafc;strokeColor=#cbd5e1;", 0, y, rowHeader, rowHeight)
		for columnIndex, column := range columns {
			processID, modelID := row.id, column.id
			if !processRows {
				processID, modelID = column.id, row.id
			}
			w.vertex(fmt.Sprintf("crud-cell-%d-%d", rowIndex, columnIndex), drawIOCRUDCellLabel(cells[processID+"\x00"+modelID]), "whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fillColor=#ffffff;strokeColor=#e2e8f0;", rowHeader+float64(columnIndex)*cellWidth, y, cellWidth, rowHeight)
		}
	}
	return w.sheet("CRUD matrix", "crud-matrix")
}

func drawIOCRUDCellLabel(cell *crudMatrixCell) string {
	if cell == nil {
		return "—"
	}
	var out strings.Builder
	out.WriteString(`<div style="white-space:nowrap;text-align:center;">`)
	for _, operation := range []string{"C", "R", "U", "D"} {
		if !cell.allowed[operation] {
			continue
		}
		style := "display:inline-block;margin:0 1px;padding:2px 5px;border:1px solid #cbd5e1;border-radius:3px;background:#ffffff;color:#475569;font-weight:700;"
		if cell.operations[operation] {
			style = "display:inline-block;margin:0 1px;padding:2px 5px;border:1px solid #1d4ed8;border-radius:3px;background:#1d4ed8;color:#ffffff;font-weight:700;"
		}
		fmt.Fprintf(&out, `<span style="%s">%s</span>`, style, operation)
	}
	out.WriteString(`</div>`)
	return out.String()
}

func appendDrawIOAnnotations(w *drawIOWriter, annotations []SourceCanvasAnnotation) {
	for _, annotation := range annotations {
		color, fill := safeSVGColor(annotation.Color, "#334155"), safeSVGColor(annotation.Fill, "#fef9c3")
		switch annotation.Kind {
		case "sticky_note":
			w.vertex("annotation-"+annotation.ID, annotation.Text, "shape=note;whiteSpace=wrap;html=0;align=left;verticalAlign=top;spacing=12;fillColor="+fill+";strokeColor="+color+";", annotation.X, annotation.Y, annotation.Width, annotation.Height)
		case "arrow":
			startID, endID := "annotation-start-"+annotation.ID, "annotation-end-"+annotation.ID
			w.vertex(startID, "", "opacity=0;strokeOpacity=0;fillOpacity=0;", annotation.Start.X, annotation.Start.Y, 1, 1)
			w.vertex(endID, "", "opacity=0;strokeOpacity=0;fillOpacity=0;", annotation.End.X, annotation.End.Y, 1, 1)
			w.edge("annotation-"+annotation.ID, annotation.Text, "edgeStyle=none;html=0;strokeColor="+color+";strokeWidth="+number(annotation.StrokeWidth)+";endArrow=block;", startID, endID)
		}
	}
}
