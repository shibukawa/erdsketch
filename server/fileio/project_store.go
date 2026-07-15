package fileio

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"

	"erdsketch/server/project"
)

type ProjectStore struct{ root string }

func NewProjectStore(root string) *ProjectStore { return &ProjectStore{root: root} }

func (s *ProjectStore) Load(ctx context.Context, projectID string) (project.DocumentSet, error) {
	if err := ctx.Err(); err != nil {
		return project.DocumentSet{}, err
	}
	data, err := os.ReadFile(filepath.Join(s.root, projectID+".erdsketch.json"))
	if errors.Is(err, os.ErrNotExist) {
		return project.DocumentSet{}, project.ErrNotFound
	}
	if err != nil {
		return project.DocumentSet{}, err
	}
	var documents project.DocumentSet
	if err := json.Unmarshal(data, &documents); err != nil {
		return project.DocumentSet{}, err
	}
	return documents, nil
}

func (s *ProjectStore) Save(ctx context.Context, documents project.DocumentSet) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := os.MkdirAll(s.root, 0o755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(documents, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	temporary, err := os.CreateTemp(s.root, ".erdsketch-*.tmp")
	if err != nil {
		return err
	}
	temporaryName := temporary.Name()
	defer os.Remove(temporaryName)
	if _, err := temporary.Write(data); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Sync(); err != nil {
		temporary.Close()
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	return os.Rename(temporaryName, filepath.Join(s.root, documents.ProjectID+".erdsketch.json"))
}
