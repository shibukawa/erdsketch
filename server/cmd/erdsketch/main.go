package main

import (
	"log"
	"os"

	"erdsketch/server/app"
)

func main() {
	address := os.Getenv("ERDSKETCH_ADDR")
	if err := app.Run(app.Config{Address: address}); err != nil {
		log.Fatal(err)
	}
}
