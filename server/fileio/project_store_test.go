package fileio

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"erdsketch/server/project"
)

func TestProjectStoreSavesAndLoadsDocumentSet(t *testing.T) {
	root := t.TempDir()
	store := NewProjectStore(root)
	want := project.DocumentSet{FormatVersion: 2, ProjectID: "demo", Documents: map[string]string{
		"project.yaml":        "format_version: 2\nproject_id: demo\n",
		"model/m1/model.yaml": "id: m1\nname: Order\n",
	}}
	if err := store.Save(context.Background(), want); err != nil {
		t.Fatal(err)
	}
	got, err := store.Load(context.Background(), "demo")
	if err != nil {
		t.Fatal(err)
	}
	if got.ProjectID != want.ProjectID || got.Documents["model/m1/model.yaml"] != want.Documents["model/m1/model.yaml"] {
		t.Fatalf("loaded %#v, want %#v", got, want)
	}
	if _, err := os.Stat(filepath.Join(root, "demo", "project.yaml")); err != nil {
		t.Fatal(err)
	}
	matches, err := filepath.Glob(filepath.Join(root, ".erdsketch-*"))
	if err != nil || len(matches) != 0 {
		t.Fatalf("temporary files after save: %v, %v", matches, err)
	}
}

func TestWriteProjectDirectoryRemovesStaleManagedDocuments(t *testing.T) {
	root := t.TempDir()
	if err := os.MkdirAll(filepath.Join(root, "model", "old"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "model", "old", "model.yaml"), []byte("id: old\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "notes.txt"), []byte("keep\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	documents := project.DocumentSet{FormatVersion: 2, ProjectID: "demo", Documents: map[string]string{"project.yaml": "format_version: 2\nproject_id: demo\n"}}
	if err := WriteProjectDirectory(context.Background(), root, documents); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, "model", "old", "model.yaml")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("stale model still exists: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, "notes.txt")); err != nil {
		t.Fatalf("unmanaged file was removed: %v", err)
	}
}
