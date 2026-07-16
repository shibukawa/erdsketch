package app

import (
	"context"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"time"

	"erdsketch/server/fileio"
	"erdsketch/server/project"
	"erdsketch/server/relay"
	"erdsketch/server/seed"
	"erdsketch/server/webassets"
	"erdsketch/server/webhandler"
)

type Config struct {
	Address     string
	ModelRoot   string
	ProjectRoot string
	Logger      *log.Logger
	Frontend    fs.FS
}

func Run(ctx context.Context, config Config) error {
	if config.Address == "" {
		config.Address = "127.0.0.1:8080"
	}
	if config.ModelRoot == "" {
		config.ModelRoot = "model/seeds"
	}
	if config.ProjectRoot == "" {
		config.ProjectRoot = "model/projects"
	}
	if config.Logger == nil {
		config.Logger = log.Default()
	}
	if config.Frontend == nil {
		frontendRoot := "fallback"
		if _, err := fs.Stat(webassets.Files, "dist/index.html"); err == nil {
			frontendRoot = "dist"
		}
		frontend, err := fs.Sub(webassets.Files, frontendRoot)
		if err != nil {
			return err
		}
		config.Frontend = frontend
	}

	seedStore := fileio.NewSeedStore(config.ModelRoot)
	seedService := seed.NewService(seedStore)
	projectService := project.NewService(fileio.NewProjectStore(config.ProjectRoot))
	api := webhandler.NewRuntime(relay.NewHub(), seedService, projectService, config.Logger)
	handler := webhandler.NewApplication(api, config.Frontend)
	server := &http.Server{Addr: config.Address, Handler: handler}
	config.Logger.Printf("erdsketch backend listening on http://%s", config.Address)
	result := make(chan error, 1)
	go func() {
		result <- server.ListenAndServe()
	}()
	select {
	case err := <-result:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdown); err != nil {
			return err
		}
		if err := <-result; !errors.Is(err, http.ErrServerClosed) {
			return err
		}
	}
	return nil
}
