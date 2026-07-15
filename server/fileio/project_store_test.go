package fileio

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"erdsketch/server/project"
)

func TestProjectStoreSavesAndLoadsDocumentSet(t *testing.T) {
	root := t.TempDir()
	store := NewProjectStore(root)
	want := project.DocumentSet{FormatVersion: 1, ProjectID: "demo", Documents: map[string]string{"project.json": "{}\n"}}
	if err := store.Save(context.Background(), want); err != nil {
		t.Fatal(err)
	}
	got, err := store.Load(context.Background(), "demo")
	if err != nil {
		t.Fatal(err)
	}
	if got.ProjectID != want.ProjectID || got.Documents["project.json"] != want.Documents["project.json"] {
		t.Fatalf("loaded %#v, want %#v", got, want)
	}
	if _, err := os.Stat(filepath.Join(root, "demo.erdsketch.json")); err != nil {
		t.Fatal(err)
	}
	matches, err := filepath.Glob(filepath.Join(root, ".erdsketch-*.tmp"))
	if err != nil || len(matches) != 0 {
		t.Fatalf("temporary files after save: %v, %v", matches, err)
	}
}
