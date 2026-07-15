package app

import (
	"errors"
	"log"
	"net/http"

	"erdsketch/server/fileio"
	"erdsketch/server/project"
	"erdsketch/server/relay"
	"erdsketch/server/seed"
	"erdsketch/server/webhandler"
)

type Config struct {
	Address     string
	ModelRoot   string
	ProjectRoot string
	Logger      *log.Logger
}

func Run(config Config) error {
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

	seedStore := fileio.NewSeedStore(config.ModelRoot)
	seedService := seed.NewService(seedStore)
	projectService := project.NewService(fileio.NewProjectStore(config.ProjectRoot))
	handler := webhandler.NewRuntime(relay.NewHub(), seedService, projectService, config.Logger)
	server := &http.Server{Addr: config.Address, Handler: handler}
	config.Logger.Printf("erdsketch backend listening on http://%s", config.Address)
	if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
