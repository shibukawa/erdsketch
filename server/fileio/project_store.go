package fileio

import (
	"context"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"erdsketch/server/project"
)

type ProjectStore struct{ root string }

func NewProjectStore(root string) *ProjectStore { return &ProjectStore{root: root} }

func (s *ProjectStore) Load(ctx context.Context, projectID string) (project.DocumentSet, error) {
	if err := ctx.Err(); err != nil {
		return project.DocumentSet{}, err
	}
	documents, err := ReadProjectDirectory(filepath.Join(s.root, projectID))
	if errors.Is(err, os.ErrNotExist) {
		return project.DocumentSet{}, project.ErrNotFound
	}
	if err == nil && documents.ProjectID != projectID {
		return project.DocumentSet{}, errors.New("project directory manifest does not match its name")
	}
	return documents, err
}

func (s *ProjectStore) Save(ctx context.Context, documents project.DocumentSet) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := os.MkdirAll(s.root, 0o755); err != nil {
		return err
	}
	temporary, err := os.MkdirTemp(s.root, ".erdsketch-*")
	if err != nil {
		return err
	}
	defer os.RemoveAll(temporary)
	if err := writeProjectDocuments(ctx, temporary, documents); err != nil {
		return err
	}
	target := filepath.Join(s.root, documents.ProjectID)
	backup := target + ".previous"
	if err := os.RemoveAll(backup); err != nil {
		return err
	}
	if err := os.Rename(target, backup); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if err := os.Rename(temporary, target); err != nil {
		_ = os.Rename(backup, target)
		return err
	}
	return os.RemoveAll(backup)
}

func ReadProjectDirectory(path string) (project.DocumentSet, error) {
	if _, err := os.Stat(path); err != nil {
		return project.DocumentSet{}, err
	}
	documents := make(map[string]string)
	names, err := managedProjectPaths(path)
	if err != nil {
		return project.DocumentSet{}, err
	}
	for _, name := range names {
		data, err := os.ReadFile(filepath.Join(path, filepath.FromSlash(name)))
		if err != nil {
			return project.DocumentSet{}, err
		}
		documents[name] = string(data)
	}
	projectID, err := projectIDFromManifest(documents["project.yaml"])
	if err != nil {
		return project.DocumentSet{}, err
	}
	result := project.DocumentSet{FormatVersion: 2, ProjectID: projectID, Documents: documents}
	if err := project.Validate(result); err != nil {
		return project.DocumentSet{}, err
	}
	return result, nil
}

func WriteProjectDirectory(ctx context.Context, path string, documents project.DocumentSet) error {
	if err := project.Validate(documents); err != nil {
		return err
	}
	if err := os.MkdirAll(path, 0o755); err != nil {
		return err
	}
	previous, err := managedProjectPaths(path)
	if err != nil {
		return err
	}
	if err := writeProjectDocuments(ctx, path, documents); err != nil {
		return err
	}
	for _, name := range previous {
		if _, exists := documents.Documents[name]; !exists {
			if err := os.Remove(filepath.Join(path, filepath.FromSlash(name))); err != nil && !errors.Is(err, os.ErrNotExist) {
				return err
			}
		}
	}
	return nil
}

func managedProjectPaths(path string) ([]string, error) {
	managedRoots := map[string]bool{"model": true, "erd": true, "dfd": true, "vocabulary": true, "domain": true}
	var names []string
	err := filepath.WalkDir(path, func(current string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			return nil
		}
		relative, err := filepath.Rel(path, current)
		if err != nil {
			return err
		}
		name := filepath.ToSlash(relative)
		root := strings.SplitN(name, "/", 2)[0]
		if name == "project.yaml" || (managedRoots[root] && strings.HasSuffix(name, ".yaml")) {
			names = append(names, name)
		}
		return nil
	})
	return names, err
}

func writeProjectDocuments(ctx context.Context, root string, documents project.DocumentSet) error {
	if err := project.Validate(documents); err != nil {
		return err
	}
	names := make([]string, 0, len(documents.Documents))
	for name := range documents.Documents {
		names = append(names, name)
	}
	sort.Strings(names)
	for _, name := range names {
		if err := ctx.Err(); err != nil {
			return err
		}
		path := filepath.Join(root, filepath.FromSlash(name))
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return err
		}
		if err := os.WriteFile(path, []byte(documents.Documents[name]), 0o644); err != nil {
			return err
		}
	}
	return nil
}

func projectIDFromManifest(text string) (string, error) {
	for _, line := range strings.Split(text, "\n") {
		key, value, found := strings.Cut(line, ":")
		if found && strings.TrimSpace(key) == "project_id" {
			projectID := strings.Trim(strings.TrimSpace(value), "\"'")
			if projectID != "" {
				return projectID, nil
			}
		}
	}
	return "", errors.New("project_id is missing from project.yaml")
}
