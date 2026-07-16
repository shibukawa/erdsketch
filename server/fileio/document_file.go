package fileio

import (
	"encoding/json"
	"os"
	"path/filepath"

	"erdsketch/server/project"
)

func ReadProjectFile(path string) (project.DocumentSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return project.DocumentSet{}, err
	}
	var documents project.DocumentSet
	if err := json.Unmarshal(data, &documents); err != nil {
		return project.DocumentSet{}, err
	}
	if err := project.Validate(documents); err != nil {
		return project.DocumentSet{}, err
	}
	return documents, nil
}

func WriteProjectFile(path string, documents project.DocumentSet) error {
	if err := project.Validate(documents); err != nil {
		return err
	}
	data, err := json.MarshalIndent(documents, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	directory := filepath.Dir(path)
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return err
	}
	temporary, err := os.CreateTemp(directory, ".erdsketch-*.tmp")
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
	return os.Rename(temporaryName, path)
}
