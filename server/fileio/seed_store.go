package fileio

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"erdsketch/server/seed"
)

type SeedStore struct {
	root string
}

func NewSeedStore(root string) *SeedStore {
	return &SeedStore{root: root}
}

func (s *SeedStore) List(ctx context.Context) ([]seed.Document, error) {
	paths, err := filepath.Glob(filepath.Join(s.root, "*.seed.yaml"))
	if err != nil {
		return nil, err
	}

	documents := make([]seed.Document, 0, len(paths))
	for _, path := range paths {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		text, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		documents = append(documents, seed.Document{
			Name: strings.TrimPrefix(filepath.ToSlash(path), "./"),
			Text: string(text),
		})
	}
	return documents, nil
}
