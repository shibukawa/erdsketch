package codegenjson

import (
	"fmt"
	"math"
	"sort"
	"strings"
)

const (
	erdCardWidth  = 300.0
	erdCardHeight = 194.0
	svgMargin     = 48.0
)

type svgPoint struct{ x, y float64 }
type svgBounds struct {
	minX, minY, maxX, maxY float64
	set                    bool
}

func (b *svgBounds) addRect(x, y, width, height float64) {
	b.addPoint(x, y)
	b.addPoint(x+width, y+height)
}

func (b *svgBounds) addPoint(x, y float64) {
	if !b.set {
		b.minX, b.maxX, b.minY, b.maxY, b.set = x, x, y, y, true
		return
	}
	b.minX, b.maxX = math.Min(b.minX, x), math.Max(b.maxX, x)
	b.minY, b.maxY = math.Min(b.minY, y), math.Max(b.maxY, y)
}

func (b svgBounds) viewBox() (float64, float64, float64, float64) {
	if !b.set {
		return 0, 0, 800, 500
	}
	return b.minX - svgMargin, b.minY - svgMargin, math.Max(1, b.maxX-b.minX+2*svgMargin), math.Max(1, b.maxY-b.minY+2*svgMargin)
}

func svgArtifacts(state ProjectState, options MarkdownOptions) ([]ExportArtifact, []diagramLink) {
	artifacts := make([]ExportArtifact, 0, len(state.Canvases)+len(state.DFD.Canvases)+1)
	links := make([]diagramLink, 0, cap(artifacts))
	erdPaths := erdDiagramPaths(erdCanvases(state))
	for _, canvas := range erdCanvases(state) {
		path := erdPaths[canvas.ID]
		artifacts = append(artifacts, svgArtifact(path, renderERDSVG(canvas, state, options)))
		links = append(links, diagramLink{Kind: "ERD", Name: emptyLabel(canvas.Name), Path: path, CanvasID: canvas.ID})
	}
	dfdPaths := dfdDiagramPaths(dfdCanvases(state))
	for _, canvas := range dfdCanvases(state) {
		path := dfdPaths[canvas.ID]
		artifacts = append(artifacts, svgArtifact(path, renderDFDSVG(canvas, state, options)))
		links = append(links, diagramLink{Kind: "DFD", Name: emptyLabel(canvas.Name), Path: path, CanvasID: canvas.ID})
	}
	crudPath := "diagrams/crud-matrix.svg"
	artifacts = append(artifacts, svgArtifact(crudPath, renderCRUDSVG(state, options)))
	links = append(links, diagramLink{Kind: "CRUD", Name: "CRUD matrix", Path: crudPath})
	return artifacts, links
}

type diagramLink struct{ Kind, Name, Path, CanvasID string }

func svgArtifact(path, content string) ExportArtifact {
	return ExportArtifact{Path: path, MediaType: "image/svg+xml; charset=utf-8", Content: content}
}

func erdCanvases(state ProjectState) []SourceERDCanvas {
	result := append([]SourceERDCanvas(nil), state.Canvases...)
	if len(result) == 0 && len(state.Seeds) > 0 {
		result = []SourceERDCanvas{{ID: "main", Name: "Main"}}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func dfdCanvases(state ProjectState) []SourceDFDCanvas {
	byID := make(map[string]SourceDFDCanvas, len(state.DFD.Canvases))
	for _, canvas := range state.DFD.Canvases {
		byID[canvas.ID] = canvas
	}
	for _, node := range state.DFD.Nodes {
		if _, ok := byID[node.CanvasID]; !ok && node.CanvasID != "" {
			byID[node.CanvasID] = SourceDFDCanvas{ID: node.CanvasID, Name: node.CanvasID}
		}
	}
	result := make([]SourceDFDCanvas, 0, len(byID))
	for _, canvas := range byID {
		result = append(result, canvas)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].ID < result[j].ID })
	return result
}

func erdDiagramPaths(canvases []SourceERDCanvas) map[string]string {
	result := make(map[string]string, len(canvases))
	used := make(map[string]bool, len(canvases))
	for _, canvas := range canvases {
		base := safePathToken(canvas.ID)
		path := "diagrams/erd/" + base + ".svg"
		if used[path] {
			path = "diagrams/erd/" + base + "-" + stableTokenHash(canvas.ID) + ".svg"
		}
		used[path] = true
		result[canvas.ID] = path
	}
	return result
}

func dfdDiagramPaths(canvases []SourceDFDCanvas) map[string]string {
	result := make(map[string]string, len(canvases))
	used := make(map[string]bool, len(canvases))
	for _, canvas := range canvases {
		base := safePathToken(canvas.ID)
		path := "diagrams/dfd/" + base + ".svg"
		if used[path] {
			path = "diagrams/dfd/" + base + "-" + stableTokenHash(canvas.ID) + ".svg"
		}
		used[path] = true
		result[canvas.ID] = path
	}
	return result
}

type erdPlacedModel struct {
	model  SourceModel
	x, y   float64
	height float64
}

func placedModels(canvasID string, state ProjectState, options MarkdownOptions) []erdPlacedModel {
	models := modelsByID(state.Seeds)
	result := make([]erdPlacedModel, 0, len(state.Seeds))
	for _, placement := range state.Placements {
		if placement.CanvasID != canvasID {
			continue
		}
		model, ok := models[placement.SeedID]
		if ok {
			result = append(result, erdPlacedModel{model: model, x: placement.X, y: placement.Y, height: erdModelHeight(model, options)})
		}
	}
	if len(state.Placements) == 0 && canvasID == "main" {
		for _, model := range state.Seeds {
			result = append(result, erdPlacedModel{model: model, x: model.X, y: model.Y, height: erdModelHeight(model, options)})
		}
	}
	sort.Slice(result, func(i, j int) bool { return result[i].model.ID < result[j].model.ID })
	return result
}

func erdModelHeight(model SourceModel, options MarkdownOptions) float64 {
	if options.ModelCardContent == "description" {
		return erdCardHeight
	}
	rows := 0
	for _, field := range model.Fields {
		if field.PrimaryKey || field.Important {
			rows++
		}
	}
	return math.Max(erdCardHeight, 142+float64(rows)*20)
}

func renderERDSVG(canvas SourceERDCanvas, state ProjectState, options MarkdownOptions) string {
	placed := placedModels(canvas.ID, state, options)
	placedByID := make(map[string]erdPlacedModel, len(placed))
	var bounds svgBounds
	for _, item := range placed {
		placedByID[item.model.ID] = item
		addRotatedRect(&bounds, item.x, item.y, erdCardWidth, item.height, item.model.Rotation)
	}
	annotations := resolveERDAnnotations(canvasAnnotations(state.Annotations, "erd", canvas.ID), placedByID)
	addAnnotationBounds(&bounds, annotations)
	var body strings.Builder
	renderAnnotations(&body, annotations, "background")
	renderERDRelationships(&body, &bounds, state, placedByID)
	for _, item := range placed {
		renderERDCard(&body, item, options)
	}
	renderAnnotations(&body, annotations, "foreground")
	if len(placed) == 0 {
		body.WriteString(`<text x="400" y="250" text-anchor="middle" class="empty">No models on this canvas</text>`)
	}
	return wrapSVG("ERD — "+emptyLabel(canvas.Name), bounds, body.String())
}

func renderERDCard(out *strings.Builder, item erdPlacedModel, options MarkdownOptions) {
	model := item.model
	name := displayName(model.Title, model.Names, options.NameMode)
	fill, stroke := erdRoleColors(model.Role)
	cx, cy := item.x+erdCardWidth/2, item.y+item.height/2
	fmt.Fprintf(out, `<g id="model-%s" transform="rotate(%s %s %s)">`, xmlAttr(model.ID), number(model.Rotation), number(cx), number(cy))
	fmt.Fprintf(out, `<rect x="%s" y="%s" width="%s" height="%s" rx="13" fill="%s" stroke="%s" stroke-width="2"/>`, number(item.x), number(item.y), number(erdCardWidth), number(item.height), fill, stroke)
	fmt.Fprintf(out, `<text x="%s" y="%s" class="stage">%s</text>`, number(item.x+20), number(item.y+28), xmlText(strings.ToUpper(emptyLabel(model.Role))))
	fmt.Fprintf(out, `<text x="%s" y="%s" class="title">%s</text>`, number(item.x+20), number(item.y+54), xmlText(name))
	out.WriteString(`<line x1="` + number(item.x+16) + `" y1="` + number(item.y+68) + `" x2="` + number(item.x+erdCardWidth-16) + `" y2="` + number(item.y+68) + `" stroke="` + stroke + `" stroke-opacity=".35"/>`)
	lines := []string{}
	if options.ModelCardContent == "description" {
		lines = wrapText(emptyLabel(model.Description), 38, 5)
	} else {
		for _, field := range model.Fields {
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
	for index, line := range lines {
		class := "body"
		if options.ModelCardContent == "primary_keys" {
			class = "field"
		}
		fmt.Fprintf(out, `<text x="%s" y="%s" class="%s">%s</text>`, number(item.x+20), number(item.y+91+float64(index)*20), class, xmlText(line))
	}
	out.WriteString(`</g>`)
}

func renderERDRelationships(out *strings.Builder, bounds *svgBounds, state ProjectState, placed map[string]erdPlacedModel) {
	hidden := make(map[string]bool, len(state.RelationshipReferences))
	for _, reference := range state.RelationshipReferences {
		hidden[reference.RelationshipID] = len(reference.HiddenOnModelIDs) > 0
	}
	rels := append([]SourceRelationship(nil), state.Relationships...)
	sort.Slice(rels, func(i, j int) bool { return rels[i].ID < rels[j].ID })
	for _, relationship := range rels {
		source, sourceOK := placed[relationship.SourceID]
		target, targetOK := placed[relationship.TargetID]
		if !sourceOK || !targetOK || hidden[relationship.ID] {
			continue
		}
		start, sourceEdge := cardIntersection(source, svgPoint{target.x + erdCardWidth/2, target.y + target.height/2})
		end, targetEdge := cardIntersection(target, svgPoint{source.x + erdCardWidth/2, source.y + source.height/2})
		dx, dy := end.x-start.x, end.y-start.y
		c1, c2 := svgPoint{}, svgPoint{}
		if math.Abs(dx) >= math.Abs(dy) {
			c1, c2 = svgPoint{start.x + dx*0.42, start.y}, svgPoint{end.x - dx*0.42, end.y}
		} else {
			c1, c2 = svgPoint{start.x, start.y + dy*0.42}, svgPoint{end.x, end.y - dy*0.42}
		}
		bounds.addPoint(start.x, start.y)
		bounds.addPoint(end.x, end.y)
		bounds.addPoint(c1.x, c1.y)
		bounds.addPoint(c2.x, c2.y)
		fmt.Fprintf(out, `<g id="relationship-%s"><path d="M%s %s C%s %s %s %s %s %s" class="relationship"`, xmlAttr(relationship.ID), number(start.x), number(start.y), number(c1.x), number(c1.y), number(c2.x), number(c2.y), number(end.x), number(end.y))
		if relationship.Kind != "label" {
			if relationship.Direction == "target-to-source" {
				out.WriteString(` marker-start="url(#erd-arrow-start)"`)
			} else {
				out.WriteString(` marker-end="url(#erd-arrow)"`)
			}
		}
		out.WriteString(`/>`)
		if relationship.Kind == "composition" {
			out.WriteString(compositionDiamond(start, c1))
		}
		mid := cubicPoint(start, c1, c2, end, .5)
		fmt.Fprintf(out, `<text x="%s" y="%s" class="relationship-label">%s</text>`, number(mid.x), number(mid.y-5), xmlText(relationship.Name))
		if relationship.Kind != "label" {
			sLabel, tLabel := multiplicityPosition(start, sourceEdge), multiplicityPosition(end, targetEdge)
			fmt.Fprintf(out, `<text x="%s" y="%s" class="multiplicity">%s</text><text x="%s" y="%s" class="multiplicity">%s</text>`, number(sLabel.x), number(sLabel.y), xmlText(relationship.SourceMultiplicity), number(tLabel.x), number(tLabel.y), xmlText(relationship.TargetMultiplicity))
		}
		out.WriteString(`</g>`)
	}
}

func cardIntersection(item erdPlacedModel, toward svgPoint) (svgPoint, string) {
	center := svgPoint{item.x + erdCardWidth/2, item.y + item.height/2}
	dx, dy := toward.x-center.x, toward.y-center.y
	if math.Abs(dx) < .001 && math.Abs(dy) < .001 {
		return svgPoint{center.x + erdCardWidth/2, center.y}, "right"
	}
	horizontal, vertical := math.Inf(1), math.Inf(1)
	if dx != 0 {
		horizontal = erdCardWidth / 2 / math.Abs(dx)
	}
	if dy != 0 {
		vertical = item.height / 2 / math.Abs(dy)
	}
	scale, edge := vertical, "bottom"
	if dy < 0 {
		edge = "top"
	}
	if horizontal <= vertical {
		scale = horizontal
		edge = "right"
		if dx < 0 {
			edge = "left"
		}
	}
	return svgPoint{center.x + dx*scale, center.y + dy*scale}, edge
}

func multiplicityPosition(point svgPoint, edge string) svgPoint {
	switch edge {
	case "left":
		return svgPoint{point.x - 24, point.y - 18}
	case "bottom":
		return svgPoint{point.x + 24, point.y + 18}
	default:
		return svgPoint{point.x + 24, point.y - 18}
	}
}

func cubicPoint(start, c1, c2, end svgPoint, t float64) svgPoint {
	i := 1 - t
	return svgPoint{i*i*i*start.x + 3*i*i*t*c1.x + 3*i*t*t*c2.x + t*t*t*end.x, i*i*i*start.y + 3*i*i*t*c1.y + 3*i*t*t*c2.y + t*t*t*end.y}
}

func compositionDiamond(start, c1 svgPoint) string {
	dx, dy := c1.x-start.x, c1.y-start.y
	length := math.Hypot(dx, dy)
	if length < .001 {
		return ""
	}
	ux, uy := dx/length, dy/length
	mx, my := start.x+ux*9, start.y+uy*9
	return fmt.Sprintf(`<path d="M%s %s L%s %s L%s %s L%s %s Z" class="diamond"/>`, number(start.x), number(start.y), number(mx-uy*6.5), number(my+ux*6.5), number(start.x+ux*18), number(start.y+uy*18), number(mx+uy*6.5), number(my-ux*6.5))
}

func erdRoleColors(role string) (string, string) {
	switch role {
	case "master":
		return "#ecfdf5", "#047857"
	case "summary":
		return "#eff6ff", "#1d4ed8"
	case "history":
		return "#f5f3ff", "#6d28d9"
	case "work":
		return "#f8fafc", "#475569"
	default:
		return "#fffbeb", "#b45309"
	}
}

type dfdSize struct{ width, height float64 }
type dfdBox struct{ x, y, width, height float64 }

func dfdNodeSize(kind string) dfdSize {
	switch kind {
	case "model", "intermediate":
		return dfdSize{154, 108}
	case "external":
		return dfdSize{184, 82}
	default:
		return dfdSize{184, 96}
	}
}

func renderDFDSVG(canvas SourceDFDCanvas, state ProjectState, options MarkdownOptions) string {
	nodes := make([]SourceDFDNode, 0)
	byID := make(map[string]SourceDFDNode)
	var bounds svgBounds
	for _, node := range state.DFD.Nodes {
		if node.CanvasID == canvas.ID {
			nodes = append(nodes, node)
			byID[node.ID] = node
			size := dfdNodeSize(node.Kind)
			bounds.addRect(node.X, node.Y, size.width, size.height)
		}
	}
	sort.Slice(nodes, func(i, j int) bool { return nodes[i].ID < nodes[j].ID })
	groups := make([]SourceDFDGroup, 0)
	groupBoxes := make(map[string]dfdBox)
	for _, group := range state.DFD.Groups {
		if group.CanvasID == canvas.ID {
			groups = append(groups, group)
			if box, ok := dfdGroupBox(group, byID); ok {
				groupBoxes[group.ID] = box
				bounds.addRect(box.x, box.y, box.width, box.height)
			}
		}
	}
	sort.Slice(groups, func(i, j int) bool { return groups[i].ID < groups[j].ID })
	annotations := resolveDFDAnnotations(canvasAnnotations(state.Annotations, "dfd", canvas.ID), byID, groupBoxes)
	addAnnotationBounds(&bounds, annotations)
	var body strings.Builder
	renderAnnotations(&body, annotations, "background")
	for _, group := range groups {
		if box, ok := groupBoxes[group.ID]; ok {
			fmt.Fprintf(&body, `<g id="group-%s"><rect x="%s" y="%s" width="%s" height="%s" rx="8" fill="#ffffff" fill-opacity=".25" stroke="#64748b" stroke-width="2" stroke-dasharray="8 7"/><text x="%s" y="%s" class="group-label">%s GROUP</text></g>`, xmlAttr(group.ID), number(box.x), number(box.y), number(box.width), number(box.height), number(box.x+16), number(box.y-7), xmlText(strings.ToUpper(strings.ReplaceAll(group.Kind, "_", " "))))
		}
	}
	renderDFDFlows(&body, &bounds, state, canvas.ID, byID, groupBoxes)
	models := modelsByID(state.Seeds)
	for _, node := range nodes {
		renderDFDNode(&body, node, models[node.ModelID], options)
	}
	renderAnnotations(&body, annotations, "foreground")
	if len(nodes) == 0 {
		body.WriteString(`<text x="400" y="250" text-anchor="middle" class="empty">No DFD nodes on this canvas</text>`)
	}
	return wrapSVG("DFD — "+emptyLabel(canvas.Name), bounds, body.String())
}

func dfdGroupBox(group SourceDFDGroup, nodes map[string]SourceDFDNode) (dfdBox, bool) {
	var bounds svgBounds
	for _, id := range group.MemberIDs {
		if node, ok := nodes[id]; ok {
			size := dfdNodeSize(node.Kind)
			bounds.addRect(node.X, node.Y, size.width, size.height)
		}
	}
	if !bounds.set {
		return dfdBox{}, false
	}
	return dfdBox{bounds.minX - 22, bounds.minY - 30, bounds.maxX - bounds.minX + 44, bounds.maxY - bounds.minY + 52}, true
}

func renderDFDNode(out *strings.Builder, node SourceDFDNode, model SourceModel, options MarkdownOptions) {
	size := dfdNodeSize(node.Kind)
	name, description := node.Name, node.Description
	if model.ID != "" {
		name = displayName(model.Title, model.Names, options.NameMode)
		description = model.Description
	}
	fmt.Fprintf(out, `<g id="dfd-node-%s">`, xmlAttr(node.ID))
	renderDFDShape(out, node, size)
	fmt.Fprintf(out, `<text x="%s" y="%s" class="dfd-title">%s</text>`, number(node.X+26), number(node.Y+36), xmlText(name))
	lines := []string{}
	if options.ModelCardContent == "description" {
		lines = wrapText(emptyLabel(description), 24, 3)
	} else if node.Kind == "model" && model.ID != "" {
		for _, field := range model.Fields {
			if field.PrimaryKey || field.Important {
				lines = append(lines, displayName(field.Name, field.Names, options.NameMode))
			}
			if len(lines) == 3 {
				break
			}
		}
	} else if len(node.PhysicalProcesses) > 0 {
		for _, process := range node.PhysicalProcesses {
			lines = append(lines, process.Name)
		}
	} else {
		lines = []string{emptyLabel(firstNonEmpty(node.Format, node.ProcessKind, node.IntermediateKind))}
	}
	for index, line := range lines {
		fmt.Fprintf(out, `<text x="%s" y="%s" class="dfd-body">%s</text>`, number(node.X+26), number(node.Y+56+float64(index)*14), xmlText(line))
	}
	out.WriteString(`</g>`)
}

func renderDFDShape(out *strings.Builder, node SourceDFDNode, size dfdSize) {
	x, y, w, h := node.X, node.Y, size.width, size.height
	stroke, fill := "#1e293b", "#ffffff"
	if node.Kind == "model" {
		fill = "#fffbeb"
	}
	if node.Kind == "intermediate" && node.IntermediateKind == "queue" {
		stroke, fill = "#0e7490", "#ecfeff"
	}
	switch node.Kind {
	case "model":
		fmt.Fprintf(out, `<path d="M%s %s C%s %s %s %s %s %s V%s C%s %s %s %s %s %s Z" fill="%s" stroke="%s" stroke-width="2"/>`, number(x+6), number(y+18), number(x+6), number(y+2), number(x+w-6), number(y+2), number(x+w-6), number(y+18), number(y+h-18), number(x+w-6), number(y+h+2), number(x+6), number(y+h+2), number(x+6), number(y+h-18), fill, stroke)
		fmt.Fprintf(out, `<path d="M%s %s C%s %s %s %s %s %s" fill="none" stroke="%s"/>`, number(x+6), number(y+18), number(x+6), number(y+36), number(x+w-6), number(y+36), number(x+w-6), number(y+18), stroke)
	case "external":
		fmt.Fprintf(out, `<path d="M%s %s H%s L%s %s L%s %s H%s Z" fill="%s" stroke="%s" stroke-width="2"/>`, number(x+5), number(y+5), number(x+w-42), number(x+w-5), number(y+h/2), number(x+w-42), number(y+h-5), number(x+5), fill, stroke)
	case "intermediate":
		if node.IntermediateKind == "queue" {
			fmt.Fprintf(out, `<rect x="%s" y="%s" width="%s" height="%s" rx="22" fill="%s" stroke="%s" stroke-width="2"/>`, number(x+5), number(y+5), number(w-10), number(h-10), fill, stroke)
		} else {
			fmt.Fprintf(out, `<path d="M%s %s H%s L%s %s V%s H%s Z" fill="%s" stroke="%s" stroke-width="2"/>`, number(x+5), number(y+5), number(x+w-38), number(x+w-5), number(y+38), number(y+h-5), number(x+5), fill, stroke)
		}
	default:
		fmt.Fprintf(out, `<rect x="%s" y="%s" width="%s" height="%s" fill="%s" stroke="%s" stroke-width="2"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s"/><line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s"/>`, number(x+4), number(y+4), number(w-8), number(h-8), fill, stroke, number(x+18), number(y+5), number(x+18), number(y+h-5), stroke, number(x+w-18), number(y+5), number(x+w-18), number(y+h-5), stroke)
	}
}

func renderDFDFlows(out *strings.Builder, bounds *svgBounds, state ProjectState, canvasID string, nodes map[string]SourceDFDNode, groups map[string]dfdBox) {
	endpoint := func(id string) (dfdBox, bool) {
		if node, ok := nodes[id]; ok {
			size := dfdNodeSize(node.Kind)
			return dfdBox{node.X, node.Y, size.width, size.height}, true
		}
		box, ok := groups[id]
		return box, ok
	}
	flows := make([]SourceDFDFlow, 0)
	for _, flow := range state.DFD.Flows {
		if flow.CanvasID == canvasID {
			flows = append(flows, flow)
		}
	}
	sort.Slice(flows, func(i, j int) bool { return flows[i].ID < flows[j].ID })
	incidents := make(map[string][]string)
	for _, flow := range flows {
		incidents[flow.SourceID] = append(incidents[flow.SourceID], flow.ID)
		incidents[flow.DestinationID] = append(incidents[flow.DestinationID], flow.ID)
	}
	reverseLane := 0
	for _, flow := range flows {
		source, sourceOK := endpoint(flow.SourceID)
		destination, destinationOK := endpoint(flow.DestinationID)
		if !sourceOK || !destinationOK {
			continue
		}
		sourceOffset := incidentOffset(incidents[flow.SourceID], flow.ID)
		destinationOffset := incidentOffset(incidents[flow.DestinationID], flow.ID)
		path, label, routePoints := dfdRoute(source, destination, sourceOffset, destinationOffset, reverseLane)
		if source.x+source.width/2 > destination.x+destination.width/2 {
			reverseLane++
		}
		for _, point := range routePoints {
			bounds.addPoint(point.x, point.y)
		}
		fmt.Fprintf(out, `<g id="dfd-flow-%s"><path d="%s" class="dfd-flow" marker-end="url(#dfd-arrow)"`, xmlAttr(flow.ID), path)
		if flow.Bidirectional {
			out.WriteString(` marker-start="url(#dfd-arrow-start)"`)
		}
		out.WriteString(`/>`)
		if flow.Label != "" || flow.Protocol != "" {
			fmt.Fprintf(out, `<text x="%s" y="%s" class="flow-label">%s</text>`, number(label.x), number(label.y-3), xmlText(firstNonEmpty(flow.Label, "Data")))
			if flow.Protocol != "" {
				fmt.Fprintf(out, `<text x="%s" y="%s" class="protocol">%s</text>`, number(label.x), number(label.y+10), xmlText(flow.Protocol))
			}
		}
		operations := dfdFlowOperations(flow)
		if dfdEndpointContainsModel(flow.SourceID, nodes, state.DFD.Groups) && operations != "" {
			fmt.Fprintf(out, `<text x="%s" y="%s" class="flow-crud">%s</text>`, number(routePoints[0].x+12), number(routePoints[0].y-7), operations)
		}
		if dfdEndpointContainsModel(flow.DestinationID, nodes, state.DFD.Groups) && operations != "" {
			last := routePoints[len(routePoints)-1]
			fmt.Fprintf(out, `<text x="%s" y="%s" class="flow-crud">%s</text>`, number(last.x-14), number(last.y-7), operations)
		}
		out.WriteString(`</g>`)
	}
}

func dfdFlowOperations(flow SourceDFDFlow) string {
	set := make(map[string]bool)
	for _, assignment := range flow.CRUDAssignments {
		for _, operation := range assignment.Operations {
			set[operation] = true
		}
	}
	var result string
	for _, operation := range []string{"C", "R", "U", "D"} {
		if set[operation] {
			result += operation
		}
	}
	return result
}

func dfdEndpointContainsModel(id string, nodes map[string]SourceDFDNode, groups []SourceDFDGroup) bool {
	if node, ok := nodes[id]; ok {
		return node.Kind == "model"
	}
	for _, group := range groups {
		if group.ID != id {
			continue
		}
		for _, memberID := range group.MemberIDs {
			if nodes[memberID].Kind == "model" {
				return true
			}
		}
	}
	return false
}

func incidentOffset(ids []string, id string) float64 {
	index := 0
	for current, candidate := range ids {
		if candidate == id {
			index = current
			break
		}
	}
	return (float64(index) - float64(len(ids)-1)/2) * 11
}

func dfdRoute(source, destination dfdBox, sourceOffset, destinationOffset float64, reverseLane int) (string, svgPoint, []svgPoint) {
	start := svgPoint{source.x + source.width, source.y + source.height/2 + sourceOffset}
	end := svgPoint{destination.x, destination.y + destination.height/2 + destinationOffset}
	if source.x+source.width/2 > destination.x+destination.width/2 {
		lane := float64(reverseLane) * 18
		right, left := start.x+52+lane, end.x-52-lane
		detour := math.Min(source.y, destination.y) - 52 - lane
		return fmt.Sprintf("M%s %s H%s V%s H%s V%s H%s", number(start.x), number(start.y), number(right), number(detour), number(left), number(end.y), number(end.x)), svgPoint{(right + left) / 2, detour}, []svgPoint{start, {right, start.y}, {right, detour}, {left, detour}, {left, end.y}, end}
	}
	if math.Abs(start.y-end.y) <= 5 {
		return fmt.Sprintf("M%s %s H%s", number(start.x), number(start.y), number(end.x)), svgPoint{(start.x + end.x) / 2, (start.y + end.y) / 2}, []svgPoint{start, end}
	}
	mid := start.x + math.Max(28, (end.x-start.x)/2)
	return fmt.Sprintf("M%s %s H%s V%s H%s", number(start.x), number(start.y), number(mid), number(end.y), number(end.x)), svgPoint{mid, (start.y + end.y) / 2}, []svgPoint{start, {mid, start.y}, {mid, end.y}, end}
}

type crudItem struct{ id, label string }

func renderCRUDSVG(state ProjectState, options MarkdownOptions) string {
	processes := crudProcesses(state)
	models := make([]crudItem, 0, len(state.Seeds))
	for _, model := range state.Seeds {
		models = append(models, crudItem{model.ID, displayName(model.Title, model.Names, options.NameMode)})
	}
	processes = orderCRUDItems(processes, state.DFD.CRUDMatrix.ProcessOrder)
	models = orderCRUDItems(models, state.DFD.CRUDMatrix.ModelOrder)
	rows, columns, processesRows := processes, models, true
	if state.DFD.CRUDMatrix.Orientation == "models_rows" {
		rows, columns, processesRows = models, processes, false
	}
	const rowHeader, cellWidth, rowHeight, headerHeight = 220.0, 92.0, 38.0, 58.0
	width := rowHeader + math.Max(1, float64(len(columns)))*cellWidth
	height := headerHeight + math.Max(1, float64(len(rows)))*rowHeight
	bounds := svgBounds{}
	bounds.addRect(0, 0, width, height)
	assignments := crudAssignments(state)
	var body strings.Builder
	body.WriteString(`<rect x="0" y="0" width="` + number(width) + `" height="` + number(height) + `" fill="#ffffff" stroke="#cbd5e1"/>`)
	corner := "Process / Model"
	if !processesRows {
		corner = "Model / Process"
	}
	fmt.Fprintf(&body, `<rect x="0" y="0" width="%s" height="%s" fill="#e2e8f0"/><text x="12" y="34" class="crud-header">%s</text>`, number(rowHeader), number(headerHeight), corner)
	for columnIndex, column := range columns {
		x := rowHeader + float64(columnIndex)*cellWidth
		fmt.Fprintf(&body, `<rect x="%s" y="0" width="%s" height="%s" fill="#f1f5f9" stroke="#cbd5e1"/><text x="%s" y="34" text-anchor="middle" class="crud-header">%s</text>`, number(x), number(cellWidth), number(headerHeight), number(x+cellWidth/2), xmlText(truncateRunes(column.label, 13)))
	}
	for rowIndex, row := range rows {
		y := headerHeight + float64(rowIndex)*rowHeight
		fmt.Fprintf(&body, `<rect x="0" y="%s" width="%s" height="%s" fill="#f8fafc" stroke="#cbd5e1"/><text x="12" y="%s" class="crud-row">%s</text>`, number(y), number(rowHeader), number(rowHeight), number(y+25), xmlText(truncateRunes(row.label, 30)))
		for columnIndex, column := range columns {
			x := rowHeader + float64(columnIndex)*cellWidth
			processID, modelID := row.id, column.id
			if !processesRows {
				processID, modelID = column.id, row.id
			}
			fmt.Fprintf(&body, `<rect x="%s" y="%s" width="%s" height="%s" fill="#ffffff" stroke="#e2e8f0"/><text x="%s" y="%s" text-anchor="middle" class="crud-cell">%s</text>`, number(x), number(y), number(cellWidth), number(rowHeight), number(x+cellWidth/2), number(y+25), xmlText(assignments[processID+"\x00"+modelID]))
		}
	}
	if len(rows) == 0 || len(columns) == 0 {
		body.WriteString(`<text x="` + number(width/2) + `" y="` + number(height/2) + `" text-anchor="middle" class="empty">No CRUD assignments</text>`)
	}
	return wrapSVG("CRUD matrix", bounds, body.String())
}

func crudProcesses(state ProjectState) []crudItem {
	seen := make(map[string]bool)
	result := make([]crudItem, 0)
	for _, node := range state.DFD.Nodes {
		if node.Kind != "process" {
			continue
		}
		if len(node.PhysicalProcesses) == 0 && !seen[node.DefinitionID] {
			seen[node.DefinitionID] = true
			result = append(result, crudItem{node.DefinitionID, node.Name})
		}
		for _, process := range node.PhysicalProcesses {
			if !seen[process.ID] {
				seen[process.ID] = true
				result = append(result, crudItem{process.ID, process.Name})
			}
		}
	}
	return result
}

func orderCRUDItems(items []crudItem, order []string) []crudItem {
	byID := make(map[string]crudItem, len(items))
	for _, item := range items {
		byID[item.id] = item
	}
	result := make([]crudItem, 0, len(items))
	used := make(map[string]bool, len(items))
	for _, id := range order {
		if item, ok := byID[id]; ok && !used[id] {
			result, used[id] = append(result, item), true
		}
	}
	for _, item := range items {
		if !used[item.id] {
			result = append(result, item)
		}
	}
	return result
}

func crudAssignments(state ProjectState) map[string]string {
	sets := make(map[string]map[string]bool)
	for _, flow := range state.DFD.Flows {
		for _, assignment := range flow.CRUDAssignments {
			key := assignment.ProcessUnitID + "\x00" + assignment.ModelID
			if sets[key] == nil {
				sets[key] = make(map[string]bool)
			}
			for _, operation := range assignment.Operations {
				sets[key][operation] = true
			}
		}
	}
	result := make(map[string]string, len(sets))
	for key, set := range sets {
		for _, operation := range []string{"C", "R", "U", "D"} {
			if set[operation] {
				result[key] += operation
			}
		}
	}
	return result
}

func canvasAnnotations(all []SourceCanvasAnnotation, canvasType, canvasID string) []SourceCanvasAnnotation {
	result := make([]SourceCanvasAnnotation, 0)
	for _, annotation := range all {
		if annotation.CanvasType == canvasType && annotation.CanvasID == canvasID {
			result = append(result, annotation)
		}
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].ZIndex != result[j].ZIndex {
			return result[i].ZIndex < result[j].ZIndex
		}
		return result[i].ID < result[j].ID
	})
	return result
}

func resolveERDAnnotations(annotations []SourceCanvasAnnotation, placed map[string]erdPlacedModel) []SourceCanvasAnnotation {
	for index := range annotations {
		annotations[index].Start = resolveERDAnchor(annotations[index].Start, placed)
		annotations[index].End = resolveERDAnchor(annotations[index].End, placed)
	}
	return annotations
}

func resolveERDAnchor(anchor SourceAnnotationAnchor, placed map[string]erdPlacedModel) SourceAnnotationAnchor {
	if anchor.ItemKind == "model" && anchor.ItemID != "" {
		if item, ok := placed[anchor.ItemID]; ok {
			anchor.X += item.x
			anchor.Y += item.y
		}
	}
	anchor.ItemID, anchor.ItemKind = "", ""
	return anchor
}

func resolveDFDAnnotations(annotations []SourceCanvasAnnotation, nodes map[string]SourceDFDNode, groups map[string]dfdBox) []SourceCanvasAnnotation {
	resolve := func(anchor SourceAnnotationAnchor) SourceAnnotationAnchor {
		if anchor.ItemID == "" {
			return anchor
		}
		if node, ok := nodes[anchor.ItemID]; ok {
			anchor.X += node.X
			anchor.Y += node.Y
		} else if box, ok := groups[anchor.ItemID]; ok {
			anchor.X += box.x
			anchor.Y += box.y
		}
		anchor.ItemID, anchor.ItemKind = "", ""
		return anchor
	}
	for index := range annotations {
		annotations[index].Start = resolve(annotations[index].Start)
		annotations[index].End = resolve(annotations[index].End)
	}
	return annotations
}

func addAnnotationBounds(bounds *svgBounds, annotations []SourceCanvasAnnotation) {
	for _, annotation := range annotations {
		switch annotation.Kind {
		case "sticky_note":
			bounds.addRect(annotation.X, annotation.Y, annotation.Width, annotation.Height)
		case "arrow":
			bounds.addPoint(annotation.Start.X, annotation.Start.Y)
			bounds.addPoint(annotation.End.X, annotation.End.Y)
		default:
			for _, point := range annotation.Points {
				bounds.addPoint(point.X, point.Y)
			}
		}
	}
}

func renderAnnotations(out *strings.Builder, annotations []SourceCanvasAnnotation, layer string) {
	for _, annotation := range annotations {
		background := annotation.Layer == "background"
		if (layer == "background") != background {
			continue
		}
		color := safeSVGColor(annotation.Color, "#334155")
		fill := safeSVGColor(annotation.Fill, "none")
		strokeWidth := annotation.StrokeWidth
		if strokeWidth <= 0 {
			strokeWidth = 2
		}
		switch annotation.Kind {
		case "sticky_note":
			fmt.Fprintf(out, `<g id="annotation-%s"><rect x="%s" y="%s" width="%s" height="%s" rx="3" fill="%s" stroke="%s"/><rect x="%s" y="%s" width="%s" height="10" fill="%s" opacity=".35"/>`, xmlAttr(annotation.ID), number(annotation.X), number(annotation.Y), number(annotation.Width), number(annotation.Height), fill, color, number(annotation.X), number(annotation.Y), number(annotation.Width), color)
			for index, line := range wrapText(annotation.Text, 28, int(math.Max(1, (annotation.Height-32)/18))) {
				fmt.Fprintf(out, `<text x="%s" y="%s" class="note">%s</text>`, number(annotation.X+14), number(annotation.Y+34+float64(index)*18), xmlText(line))
			}
			out.WriteString(`</g>`)
		case "arrow":
			fmt.Fprintf(out, `<g id="annotation-%s"><path d="M%s %s L%s %s" fill="none" stroke="%s" stroke-width="%s" marker-end="url(#annotation-arrow)"/>`, xmlAttr(annotation.ID), number(annotation.Start.X), number(annotation.Start.Y), number(annotation.End.X), number(annotation.End.Y), color, number(strokeWidth))
			if annotation.Text != "" {
				fmt.Fprintf(out, `<text x="%s" y="%s" class="annotation-label">%s</text>`, number((annotation.Start.X+annotation.End.X)/2), number((annotation.Start.Y+annotation.End.Y)/2-6), xmlText(annotation.Text))
			}
			out.WriteString(`</g>`)
		default:
			if len(annotation.Points) == 0 {
				continue
			}
			var path strings.Builder
			for index, point := range annotation.Points {
				if index == 0 {
					path.WriteString("M")
				} else {
					path.WriteString(" L")
				}
				path.WriteString(number(point.X) + " " + number(point.Y))
			}
			dash := ""
			if annotation.Kind == "background_boundary" {
				path.WriteString(" Z")
				dash = ` stroke-dasharray="12 8"`
			}
			fmt.Fprintf(out, `<path id="annotation-%s" d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"%s/>`, xmlAttr(annotation.ID), path.String(), fill, color, number(strokeWidth), dash)
		}
	}
}

func wrapSVG(title string, bounds svgBounds, body string) string {
	x, y, width, height := bounds.viewBox()
	var out strings.Builder
	out.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	fmt.Fprintf(&out, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s %s %s %s" width="%s" height="%s" role="img" aria-labelledby="title"><title id="title">%s</title>`, number(x), number(y), number(width), number(height), number(width), number(height), xmlText(title))
	out.WriteString(`<defs><marker id="erd-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L0 6 L9 3" fill="none" stroke="#334155"/></marker><marker id="erd-arrow-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M9 0 L9 6 L0 3" fill="none" stroke="#334155"/></marker><marker id="dfd-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0 0 L0 6 L9 3 z" fill="#334155"/></marker><marker id="dfd-arrow-start" markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto"><path d="M9 0 L9 6 L0 3 z" fill="#334155"/></marker><marker id="annotation-arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0 0 L0 6 L9 3 z" fill="#334155"/></marker><style>text{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#0f172a}.title{font-size:20px;font-weight:700}.stage{font-size:10px;font-weight:700;letter-spacing:1px;fill:#64748b}.body{font-size:13px;fill:#334155}.field{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#334155}.relationship,.dfd-flow{fill:none;stroke:#334155;stroke-width:2}.diamond{fill:#334155;stroke:#334155}.relationship-label,.flow-label,.annotation-label{font-size:11px;font-weight:600;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:4px}.multiplicity{font:700 11px ui-monospace,SFMono-Regular,Menlo,monospace;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:4px;fill:#475569}.dfd-title{font-size:14px;font-weight:700}.dfd-body{font-size:9px;fill:#475569}.protocol{font-size:9px;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:3px;fill:#64748b}.flow-crud{font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;text-anchor:middle;paint-order:stroke;stroke:#fff;stroke-width:4px;fill:#334155}.group-label{font-size:10px;font-weight:700;letter-spacing:.7px;fill:#475569}.crud-header{font-size:11px;font-weight:700}.crud-row{font-size:12px;font-weight:600}.crud-cell{font:700 12px ui-monospace,SFMono-Regular,Menlo,monospace;fill:#1d4ed8}.note{font-size:13px;font-weight:500}.empty{font-size:14px;fill:#64748b}</style></defs>`)
	out.WriteString(body)
	out.WriteString(`</svg>`)
	return out.String()
}

func addRotatedRect(bounds *svgBounds, x, y, width, height, degrees float64) {
	if degrees == 0 {
		bounds.addRect(x, y, width, height)
		return
	}
	cx, cy, radians := x+width/2, y+height/2, degrees*math.Pi/180
	cosine, sine := math.Cos(radians), math.Sin(radians)
	for _, point := range []svgPoint{{x, y}, {x + width, y}, {x + width, y + height}, {x, y + height}} {
		dx, dy := point.x-cx, point.y-cy
		bounds.addPoint(cx+dx*cosine-dy*sine, cy+dx*sine+dy*cosine)
	}
}

func xmlText(value string) string {
	value = strings.ReplaceAll(value, "&", "&amp;")
	value = strings.ReplaceAll(value, "<", "&lt;")
	value = strings.ReplaceAll(value, ">", "&gt;")
	return value
}

func xmlAttr(value string) string {
	value = xmlText(value)
	value = strings.ReplaceAll(value, `"`, "&quot;")
	value = strings.ReplaceAll(value, "'", "&apos;")
	return value
}

func safeSVGColor(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "none" || strings.HasPrefix(value, "#") {
		for _, current := range strings.TrimPrefix(value, "#") {
			if !((current >= '0' && current <= '9') || (current >= 'a' && current <= 'f') || (current >= 'A' && current <= 'F')) {
				return fallback
			}
		}
		if value == "none" || len(value) == 4 || len(value) == 7 || len(value) == 9 {
			return value
		}
	}
	return fallback
}

func number(value float64) string {
	if math.Abs(value) < .0000001 {
		value = 0
	}
	return fmt.Sprintf("%.3f", value)
}

func wrapText(value string, width, maxLines int) []string {
	words := strings.Fields(strings.ReplaceAll(value, "\n", " "))
	if len(words) == 0 {
		return []string{}
	}
	lines := make([]string, 0, maxLines)
	current := ""
	for _, word := range words {
		candidate := word
		if current != "" {
			candidate = current + " " + word
		}
		if len([]rune(candidate)) <= width || current == "" {
			current = candidate
			continue
		}
		lines = append(lines, current)
		current = word
		if len(lines) == maxLines {
			break
		}
	}
	if len(lines) < maxLines && current != "" {
		lines = append(lines, current)
	}
	if len(lines) > maxLines {
		lines = lines[:maxLines]
	}
	return lines
}

func truncateRunes(value string, limit int) string {
	runes := []rune(value)
	if len(runes) <= limit {
		return value
	}
	return string(runes[:limit-1]) + "…"
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
