package fileio

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestSeedStoreListsSeedFiles(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "order.seed.yaml"), []byte("name: Order\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "ignored.txt"), []byte("ignored"), 0o600); err != nil {
		t.Fatal(err)
	}

	documents, err := NewSeedStore(root).List(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(documents) != 1 {
		t.Fatalf("documents: got %d, want 1", len(documents))
	}
	if documents[0].Text != "name: Order\n" {
		t.Fatalf("text: got %q", documents[0].Text)
	}
}
