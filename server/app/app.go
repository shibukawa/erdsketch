package app

import (
	"errors"
	"log"
	"net/http"

	"erdsketch/server/collaboration"
	"erdsketch/server/fileio"
	"erdsketch/server/seed"
	"erdsketch/server/webhandler"
)

type Config struct {
	Address   string
	ModelRoot string
	Logger    *log.Logger
}

func Run(config Config) error {
	if config.Address == "" {
		config.Address = "127.0.0.1:8080"
	}
	if config.ModelRoot == "" {
		config.ModelRoot = "model/seeds"
	}
	if config.Logger == nil {
		config.Logger = log.Default()
	}

	seedStore := fileio.NewSeedStore(config.ModelRoot)
	seedService := seed.NewService(seedStore)
	handler := webhandler.New(collaboration.NewHub(), seedService, config.Logger)
	server := &http.Server{Addr: config.Address, Handler: handler}
	config.Logger.Printf("erdsketch backend listening on http://%s", config.Address)
	if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
