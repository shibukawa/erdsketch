package seed

import "context"

type Document struct {
	Name string
	Text string
}

type Store interface {
	List(context.Context) ([]Document, error)
}

type Service struct {
	store Store
}

func NewService(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) List(ctx context.Context) ([]Document, error) {
	return s.store.List(ctx)
}
