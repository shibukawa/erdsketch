package fileio

import (
	"os"
	"path/filepath"
	"testing"

	"erdsketch/server/project"
)

func TestProjectDocumentFileRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "demo.erdsketch.json")
	want := project.DocumentSet{FormatVersion: 1, ProjectID: "demo", Documents: map[string]string{"project.json": "{}\n"}}
	if err := WriteProjectFile(path, want); err != nil {
		t.Fatal(err)
	}
	got, err := ReadProjectFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if got.ProjectID != want.ProjectID || got.Documents["project.json"] != want.Documents["project.json"] {
		t.Fatalf("got %#v, want %#v", got, want)
	}
}

func TestReadProjectFileRejectsInvalidDocumentSet(t *testing.T) {
	path := filepath.Join(t.TempDir(), "invalid.erdsketch.json")
	if err := os.WriteFile(path, []byte(`{"formatVersion":1,"projectId":"../demo","documents":{"project.json":"{}"}}`), 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := ReadProjectFile(path); err == nil {
		t.Fatal("expected invalid document set error")
	}
}
