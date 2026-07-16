package project

import (
	"context"
	"errors"
	"strings"
)

var ErrNotFound = errors.New("project not found")

type DocumentSet struct {
	FormatVersion int               `json:"formatVersion"`
	ProjectID     string            `json:"projectId"`
	Documents     map[string]string `json:"documents"`
}

type Store interface {
	Load(context.Context, string) (DocumentSet, error)
	Save(context.Context, DocumentSet) error
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

func (s *Service) Load(ctx context.Context, projectID string) (DocumentSet, error) {
	if !validName(projectID) {
		return DocumentSet{}, ErrNotFound
	}
	return s.store.Load(ctx, projectID)
}

func (s *Service) Save(ctx context.Context, documents DocumentSet) error {
	if err := Validate(documents); err != nil {
		return err
	}
	return s.store.Save(ctx, documents)
}

func Validate(documents DocumentSet) error {
	if documents.FormatVersion != 1 || !validName(documents.ProjectID) || len(documents.Documents) == 0 {
		return errors.New("invalid project document set")
	}
	for name := range documents.Documents {
		if !validDocumentPath(name) {
			return errors.New("invalid project document path")
		}
	}
	return nil
}

func validName(value string) bool {
	if value == "" || value == "." || value == ".." || strings.ContainsAny(value, `/\\\x00`) {
		return false
	}
	return true
}

func validDocumentPath(value string) bool {
	if value == "" || strings.HasPrefix(value, "/") || strings.Contains(value, "\\") {
		return false
	}
	for _, part := range strings.Split(value, "/") {
		if part == "" || part == "." || part == ".." {
			return false
		}
	}
	return true
}
