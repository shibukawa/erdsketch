package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"erdsketch/server/app"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	config := app.Config{
		Address:     os.Getenv("ERDSKETCH_ADDR"),
		ModelRoot:   os.Getenv("ERDSKETCH_MODEL_ROOT"),
		ProjectRoot: os.Getenv("ERDSKETCH_PROJECT_ROOT"),
	}
	if err := app.Run(ctx, config); err != nil {
		log.Fatal(err)
	}
}
