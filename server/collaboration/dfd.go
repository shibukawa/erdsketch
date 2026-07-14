package collaboration

import (
	"fmt"
	"strings"
)

func defaultDFDState() DFDState {
	return DFDState{Canvases: []DFDCanvas{{ID: DefaultDFDCanvasID, Name: "Main data flow"}}, Nodes: []DFDNode{}, Flows: []DFDFlow{}, Groups: []DFDGroup{}}
}

func (h *Hub) UpdateDFD(clientID string, next DFDState) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.users[clientID]; !ok {
		return ErrUnknownClient
	}
	next = normalizeDFD(next, h.seeds)
	if !validDFD(next, h.seeds) {
		return ErrDFDInvalid
	}
	h.dfd = cloneDFDState(next)
	h.broadcastLocked()
	return nil
}

func normalizeDFD(state DFDState, seeds []ModelSeed) DFDState {
	state = cloneDFDState(state)
	for index := range state.Nodes {
		node := &state.Nodes[index]
		if node.Kind == "logical-process" {
			node.Kind = "process"
			if node.ProcessKind == "" {
				node.ProcessKind = "batch"
			}
		}
		if node.IntermediateKind == "api-payload" {
			node.IntermediateKind = "file"
		}
		if node.IntermediateKind == "stream" {
			node.IntermediateKind = "queue"
		}
		for physicalIndex := range node.PhysicalProcesses {
			physical := &node.PhysicalProcesses[physicalIndex]
			if physical.ID == "" {
				physical.ID = fmt.Sprintf("%s:physical:%d", node.DefinitionID, physicalIndex)
			}
		}
	}
	nodes := make(map[string]DFDNode, len(state.Nodes))
	groups := make(map[string]DFDGroup, len(state.Groups))
	for _, node := range state.Nodes {
		nodes[node.ID] = node
	}
	for _, group := range state.Groups {
		groups[group.ID] = group
	}
	for index := range state.Flows {
		state.Flows[index] = normalizeDFDFlowCRUD(state.Flows[index], nodes, groups)
	}
	state.CRUDMatrix = normalizeDFDCRUDMatrix(state.CRUDMatrix, state.Nodes, seeds)
	return state
}

type dfdCRUDSpec struct {
	ProcessUnitID string
	ModelID       string
	Allowed       map[string]bool
	Defaults      []string
}

func normalizeDFDFlowCRUD(flow DFDFlow, nodes map[string]DFDNode, groups map[string]DFDGroup) DFDFlow {
	existing := make(map[string]DFDCRUDAssignment, len(flow.CRUDAssignments))
	for _, assignment := range flow.CRUDAssignments {
		existing[assignment.ProcessUnitID+"\x00"+assignment.ModelID] = assignment
	}
	specs := dfdCRUDSpecs(flow, nodes, groups)
	assignments := make([]DFDCRUDAssignment, 0, len(specs))
	for _, spec := range specs {
		key := spec.ProcessUnitID + "\x00" + spec.ModelID
		operations := existing[key].Operations
		if len(operations) == 0 {
			if spec.Allowed["R"] && flow.SourceCRUD == "R" {
				operations = append(operations, "R")
			}
			if spec.Allowed["C"] && len(flow.DestinationCRUD) > 0 {
				operations = append(operations, flow.DestinationCRUD...)
			}
		}
		operations = normalizeCRUDOperations(operations, spec.Allowed)
		if len(operations) == 0 {
			operations = append([]string(nil), spec.Defaults...)
		}
		assignments = append(assignments, DFDCRUDAssignment{ProcessUnitID: spec.ProcessUnitID, ModelID: spec.ModelID, Operations: operations})
	}
	flow.CRUDAssignments = assignments
	flow.SourceCRUD = ""
	flow.DestinationCRUD = nil
	return flow
}

func dfdCRUDSpecs(flow DFDFlow, nodes map[string]DFDNode, groups map[string]DFDGroup) []dfdCRUDSpec {
	order := make([]string, 0)
	specs := make(map[string]*dfdCRUDSpec)
	addDirection := func(fromIDs, toIDs []string) {
		for _, fromID := range fromIDs {
			from := nodes[fromID]
			for _, toID := range toIDs {
				to := nodes[toID]
				var process DFDNode
				var modelID string
				var allowed []string
				var defaults []string
				switch {
				case from.Kind == "process" && to.Kind == "model":
					process, modelID, allowed, defaults = from, to.ModelID, []string{"C", "U", "D"}, []string{"C"}
				case from.Kind == "model" && to.Kind == "process":
					process, modelID, allowed, defaults = to, from.ModelID, []string{"R"}, []string{"R"}
				default:
					continue
				}
				for _, processUnitID := range dfdProcessUnitIDs(process) {
					key := processUnitID + "\x00" + modelID
					spec := specs[key]
					if spec == nil {
						spec = &dfdCRUDSpec{ProcessUnitID: processUnitID, ModelID: modelID, Allowed: make(map[string]bool)}
						specs[key] = spec
						order = append(order, key)
					}
					for _, operation := range allowed {
						spec.Allowed[operation] = true
					}
					for _, operation := range defaults {
						if !containsString(spec.Defaults, operation) {
							spec.Defaults = append(spec.Defaults, operation)
						}
					}
				}
			}
		}
	}
	addDirection(dfdEndpointNodeIDs(flow.SourceID, nodes, groups), dfdEndpointNodeIDs(flow.DestinationID, nodes, groups))
	if flow.Bidirectional {
		addDirection(dfdEndpointNodeIDs(flow.DestinationID, nodes, groups), dfdEndpointNodeIDs(flow.SourceID, nodes, groups))
	}
	result := make([]dfdCRUDSpec, 0, len(order))
	for _, key := range order {
		spec := *specs[key]
		spec.Defaults = normalizeCRUDOperations(spec.Defaults, spec.Allowed)
		result = append(result, spec)
	}
	return result
}

func dfdEndpointNodeIDs(id string, nodes map[string]DFDNode, groups map[string]DFDGroup) []string {
	if _, ok := nodes[id]; ok {
		return []string{id}
	}
	return groups[id].MemberIDs
}

func dfdProcessUnitIDs(node DFDNode) []string {
	if len(node.PhysicalProcesses) == 0 {
		return []string{node.DefinitionID}
	}
	result := make([]string, 0, len(node.PhysicalProcesses))
	for _, physical := range node.PhysicalProcesses {
		result = append(result, physical.ID)
	}
	return result
}

func normalizeCRUDOperations(operations []string, allowed map[string]bool) []string {
	seen := make(map[string]bool, len(operations))
	result := make([]string, 0, len(operations))
	for _, candidate := range []string{"C", "R", "U", "D"} {
		for _, operation := range operations {
			if operation == candidate && allowed[operation] && !seen[operation] {
				seen[operation] = true
				result = append(result, operation)
			}
		}
	}
	return result
}

func normalizeDFDCRUDMatrix(matrix DFDCRUDMatrix, nodes []DFDNode, seeds []ModelSeed) DFDCRUDMatrix {
	if matrix.Orientation != "models_rows" {
		matrix.Orientation = "processes_rows"
	}
	processIDs := make([]string, 0)
	processSet := make(map[string]bool)
	for _, node := range nodes {
		if node.Kind != "process" {
			continue
		}
		for _, id := range dfdProcessUnitIDs(node) {
			if !processSet[id] {
				processSet[id] = true
				processIDs = append(processIDs, id)
			}
		}
	}
	modelIDs := make([]string, 0, len(seeds))
	modelSet := make(map[string]bool, len(seeds))
	for _, seed := range seeds {
		modelSet[seed.ID] = true
		modelIDs = append(modelIDs, seed.ID)
	}
	matrix.ProcessOrder = normalizeIDOrder(matrix.ProcessOrder, processIDs, processSet)
	matrix.ModelOrder = normalizeIDOrder(matrix.ModelOrder, modelIDs, modelSet)
	return matrix
}

func normalizeIDOrder(current, available []string, allowed map[string]bool) []string {
	seen := make(map[string]bool, len(current))
	result := make([]string, 0, len(available))
	for _, id := range current {
		if allowed[id] && !seen[id] {
			seen[id] = true
			result = append(result, id)
		}
	}
	for _, id := range available {
		if !seen[id] {
			seen[id] = true
			result = append(result, id)
		}
	}
	return result
}

func containsString(items []string, candidate string) bool {
	for _, item := range items {
		if item == candidate {
			return true
		}
	}
	return false
}

func validDFD(state DFDState, seeds []ModelSeed) bool {
	if len(state.Canvases) == 0 {
		return false
	}
	canvasIDs := make(map[string]bool, len(state.Canvases))
	canvasNames := make(map[string]bool, len(state.Canvases))
	for _, canvas := range state.Canvases {
		name := strings.ToLower(strings.TrimSpace(canvas.Name))
		if canvas.ID == "" || name == "" || canvasIDs[canvas.ID] || canvasNames[name] {
			return false
		}
		canvasIDs[canvas.ID], canvasNames[name] = true, true
	}
	nodes := make(map[string]DFDNode, len(state.Nodes))
	definitions := make(map[string]bool, len(state.Nodes))
	for _, node := range state.Nodes {
		if node.ID == "" || node.DefinitionID == "" || !canvasIDs[node.CanvasID] || nodes[node.ID].ID != "" || !validDFDNode(node, seeds) {
			return false
		}
		if node.Kind != "external" {
			key := node.CanvasID + "\x00" + node.DefinitionID
			if definitions[key] {
				return false
			}
			definitions[key] = true
		}
		nodes[node.ID] = node
	}
	groups := make(map[string]DFDGroup, len(state.Groups))
	membership := make(map[string]string)
	for _, group := range state.Groups {
		if group.ID == "" || !canvasIDs[group.CanvasID] || groups[group.ID].ID != "" || (group.Kind != "process" && group.Kind != "data_entity") || len(group.MemberIDs) < 2 {
			return false
		}
		seen := make(map[string]bool, len(group.MemberIDs))
		for _, memberID := range group.MemberIDs {
			node, ok := nodes[memberID]
			if !ok || node.CanvasID != group.CanvasID || seen[memberID] || membership[memberID] != "" || dfdNodeClass(node) != group.Kind {
				return false
			}
			seen[memberID] = true
			membership[memberID] = group.ID
		}
		groups[group.ID] = group
	}
	flowIDs := make(map[string]bool, len(state.Flows))
	for _, flow := range state.Flows {
		if flow.ID == "" || flowIDs[flow.ID] || !canvasIDs[flow.CanvasID] || flow.SourceID == flow.DestinationID {
			return false
		}
		sourceClass, sourceCanvas, ok := dfdEndpoint(flow.SourceID, nodes, groups)
		if !ok || sourceCanvas != flow.CanvasID {
			return false
		}
		destinationClass, destinationCanvas, ok := dfdEndpoint(flow.DestinationID, nodes, groups)
		if !ok || destinationCanvas != flow.CanvasID || !validDFDEndpointPair(sourceClass, destinationClass) {
			return false
		}
		if !validDFDCRUD(flow, nodes, groups) {
			return false
		}
		flowIDs[flow.ID] = true
	}
	return true
}

func validDFDNode(node DFDNode, seeds []ModelSeed) bool {
	switch node.Kind {
	case "process":
		if strings.TrimSpace(node.Name) == "" || (node.ProcessKind != "batch" && node.ProcessKind != "ui") {
			return false
		}
		physicalIDs := make(map[string]bool, len(node.PhysicalProcesses))
		for _, physical := range node.PhysicalProcesses {
			if physical.ID == "" || strings.TrimSpace(physical.Name) == "" || physicalIDs[physical.ID] {
				return false
			}
			physicalIDs[physical.ID] = true
		}
		return true
	case "model":
		return node.ModelID != "" && seedIndexByID(seeds, node.ModelID) >= 0
	case "external":
		return strings.TrimSpace(node.Name) != ""
	case "intermediate":
		return strings.TrimSpace(node.Name) != "" && validIntermediateKind(node.IntermediateKind)
	default:
		return false
	}
}

func validIntermediateKind(kind string) bool {
	return kind == "file" || kind == "queue"
}

func dfdNodeClass(node DFDNode) string {
	switch node.Kind {
	case "process":
		return "process"
	case "model", "intermediate":
		return "data_entity"
	case "external":
		return "external"
	default:
		return ""
	}
}

func dfdEndpointContainsModel(id string, nodes map[string]DFDNode, groups map[string]DFDGroup) bool {
	if node, ok := nodes[id]; ok {
		return node.Kind == "model"
	}
	for _, memberID := range groups[id].MemberIDs {
		if nodes[memberID].Kind == "model" {
			return true
		}
	}
	return false
}

func validDFDCRUD(flow DFDFlow, nodes map[string]DFDNode, groups map[string]DFDGroup) bool {
	specs := dfdCRUDSpecs(flow, nodes, groups)
	if len(flow.CRUDAssignments) != len(specs) || flow.SourceCRUD != "" || len(flow.DestinationCRUD) != 0 {
		return false
	}
	specByKey := make(map[string]dfdCRUDSpec, len(specs))
	for _, spec := range specs {
		specByKey[spec.ProcessUnitID+"\x00"+spec.ModelID] = spec
	}
	seenAssignments := make(map[string]bool, len(flow.CRUDAssignments))
	for _, assignment := range flow.CRUDAssignments {
		key := assignment.ProcessUnitID + "\x00" + assignment.ModelID
		spec, ok := specByKey[key]
		if !ok || seenAssignments[key] || len(assignment.Operations) == 0 {
			return false
		}
		seenAssignments[key] = true
		if normalized := normalizeCRUDOperations(assignment.Operations, spec.Allowed); len(normalized) != len(assignment.Operations) {
			return false
		}
	}
	return true
}

func dfdEndpoint(id string, nodes map[string]DFDNode, groups map[string]DFDGroup) (string, string, bool) {
	if node, ok := nodes[id]; ok {
		return dfdNodeClass(node), node.CanvasID, true
	}
	if group, ok := groups[id]; ok {
		return group.Kind, group.CanvasID, true
	}
	return "", "", false
}

func validDFDEndpointPair(source, destination string) bool {
	if source == "" || destination == "" || source == destination {
		return false
	}
	return source == "external" || destination == "external" || source == "process" || destination == "process"
}

func cloneDFDState(state DFDState) DFDState {
	copyState := DFDState{
		Canvases:   append([]DFDCanvas(nil), state.Canvases...),
		Nodes:      append([]DFDNode(nil), state.Nodes...),
		Flows:      append([]DFDFlow(nil), state.Flows...),
		Groups:     append([]DFDGroup(nil), state.Groups...),
		CRUDMatrix: DFDCRUDMatrix{Orientation: state.CRUDMatrix.Orientation, ProcessOrder: append([]string(nil), state.CRUDMatrix.ProcessOrder...), ModelOrder: append([]string(nil), state.CRUDMatrix.ModelOrder...)},
	}
	for index := range copyState.Nodes {
		copyState.Nodes[index].PhysicalProcesses = append([]DFDPhysicalProcess(nil), copyState.Nodes[index].PhysicalProcesses...)
	}
	for index := range copyState.Groups {
		copyState.Groups[index].MemberIDs = append([]string(nil), copyState.Groups[index].MemberIDs...)
	}
	for index := range copyState.Flows {
		copyState.Flows[index].CRUDAssignments = append([]DFDCRUDAssignment(nil), copyState.Flows[index].CRUDAssignments...)
		for assignmentIndex := range copyState.Flows[index].CRUDAssignments {
			copyState.Flows[index].CRUDAssignments[assignmentIndex].Operations = append([]string(nil), copyState.Flows[index].CRUDAssignments[assignmentIndex].Operations...)
		}
		copyState.Flows[index].DestinationCRUD = append([]string(nil), copyState.Flows[index].DestinationCRUD...)
	}
	return copyState
}
