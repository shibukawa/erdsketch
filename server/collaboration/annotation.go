package collaboration

import "strings"

func (h *Hub) UpdateAnnotation(clientID string, next CanvasAnnotation, create, remove bool) (AnnotationUpdate, error) {
	h.mu.Lock()
	defer h.mu.Unlock()

	user, ok := h.users[clientID]
	if !ok {
		return AnnotationUpdate{}, ErrUnknownClient
	}
	index := annotationIndex(h.annotations, next.ID)
	result := AnnotationUpdate{User: user, Annotation: next}
	if remove {
		if index < 0 {
			return AnnotationUpdate{}, ErrAnnotationNotFound
		}
		result.Annotation = h.annotations[index]
		h.annotations = append(h.annotations[:index], h.annotations[index+1:]...)
		for id, collaborator := range h.users {
			if collaborator.SelectionID == next.ID {
				collaborator.SelectionID = ""
			}
			if collaborator.EditingAnnotationID == next.ID {
				collaborator.EditingAnnotationID = ""
			}
			h.users[id] = collaborator
		}
		result.Deleted = true
		h.broadcastLocked()
		return result, nil
	}
	if !h.validAnnotationLocked(next) {
		return AnnotationUpdate{}, ErrAnnotationInvalid
	}
	if index >= 0 {
		if create {
			return AnnotationUpdate{}, ErrAnnotationExists
		}
		if annotationEditedByOther(h.users, clientID, next.ID) && next.Text != h.annotations[index].Text {
			return AnnotationUpdate{}, ErrAnnotationEditConflict
		}
		next.CreatedBy = h.annotations[index].CreatedBy
		next.UpdatedBy = clientID
		h.annotations[index] = cloneAnnotation(next)
	} else {
		if !create {
			return AnnotationUpdate{}, ErrAnnotationNotFound
		}
		next.CreatedBy = clientID
		next.UpdatedBy = clientID
		h.annotations = append(h.annotations, cloneAnnotation(next))
		result.Created = true
	}
	result.Annotation = next
	h.broadcastLocked()
	return result, nil
}

func (h *Hub) validAnnotationLocked(annotation CanvasAnnotation) bool {
	if annotation.ID == "" || !h.canvasExistsLocked(annotation.CanvasType, annotation.CanvasID) {
		return false
	}
	switch annotation.Kind {
	case "sticky_note":
		return annotation.Width > 0 && annotation.Height > 0 && annotation.Layer == "foreground"
	case "arrow":
		return annotation.Start != nil && annotation.End != nil && annotation.Layer == "annotation"
	case "freehand_stroke":
		if annotation.Layer != "annotation" {
			return false
		}
		if len(annotation.Strokes) == 0 {
			return len(annotation.Points) >= 2
		}
		for _, stroke := range annotation.Strokes {
			if len(stroke.Points) < 2 {
				return false
			}
		}
		return true
	case "background_boundary":
		return len(annotation.Points) >= 3 && annotation.Layer == "background"
	default:
		return false
	}
}

func (h *Hub) canvasExistsLocked(canvasType, canvasID string) bool {
	switch canvasType {
	case "erd":
		return canvasIndex(h.canvases, canvasID) >= 0
	case "dfd":
		for _, canvas := range h.dfd.Canvases {
			if canvas.ID == canvasID {
				return true
			}
		}
	}
	return false
}

func annotationEditedByOther(users map[string]Collaborator, clientID, annotationID string) bool {
	for id, user := range users {
		if id != clientID && user.EditingAnnotationID == annotationID {
			return true
		}
	}
	return false
}

func annotationIndex(annotations []CanvasAnnotation, id string) int {
	for index, annotation := range annotations {
		if annotation.ID == id {
			return index
		}
	}
	return -1
}

func cloneAnnotation(annotation CanvasAnnotation) CanvasAnnotation {
	annotation.Points = append([]CanvasPoint(nil), annotation.Points...)
	annotation.Strokes = append([]AnnotationStroke(nil), annotation.Strokes...)
	for index := range annotation.Strokes {
		annotation.Strokes[index].Points = append([]CanvasPoint(nil), annotation.Strokes[index].Points...)
	}
	if annotation.Start != nil {
		start := *annotation.Start
		annotation.Start = &start
	}
	if annotation.End != nil {
		end := *annotation.End
		annotation.End = &end
	}
	annotation.Text = strings.TrimRight(annotation.Text, "\x00")
	return annotation
}

func cloneAnnotations(annotations []CanvasAnnotation) []CanvasAnnotation {
	cloned := make([]CanvasAnnotation, len(annotations))
	for index, annotation := range annotations {
		cloned[index] = cloneAnnotation(annotation)
	}
	return cloned
}
