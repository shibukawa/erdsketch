//go:build desktop || bindings

package main

import (
	"log"

	desktopapp "erdsketch/desktop/app"
)

func main() {
	if err := desktopapp.Run(desktopAssets()); err != nil {
		log.Fatal(err)
	}
}
