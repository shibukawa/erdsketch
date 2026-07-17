package app

import (
	"context"
	"errors"
	"io/fs"

	"erdsketch/server/fileio"
	"erdsketch/server/project"
	"erdsketch/server/seed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type SeedDocument struct {
	Path string `json:"path"`
	Text string `json:"text"`
}

type App struct {
	ctx   context.Context
	seeds *seed.Service
}

func New(modelRoot string) *App {
	return &App{seeds: seed.NewService(fileio.NewSeedStore(modelRoot))}
}

func Run(assets fs.FS) error {
	application := New("../model/seeds")
	return wails.Run(&options.App{
		Title:     "ERDSketch",
		Width:     1440,
		Height:    960,
		MinWidth:  1024,
		MinHeight: 720,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup: application.startup,
		Bind: []interface{}{
			application,
		},
	})
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) ListSeeds() ([]SeedDocument, error) {
	documents, err := a.seeds.List(a.ctx)
	if err != nil {
		return nil, err
	}
	result := make([]SeedDocument, 0, len(documents))
	for _, document := range documents {
		result = append(result, SeedDocument{Path: document.Name, Text: document.Text})
	}
	return result, nil
}

func (a *App) OpenProject() (*project.DocumentSet, error) {
	selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Open ERDSketch Project Folder",
	})
	if err != nil || selected == "" {
		return nil, err
	}
	documents, err := fileio.ReadProjectDirectory(selected)
	if err != nil {
		return nil, err
	}
	return &documents, nil
}

func (a *App) SaveProject(documents project.DocumentSet) error {
	selected, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Save ERDSketch Project Folder",
	})
	if err != nil || selected == "" {
		if err != nil {
			return err
		}
		return errors.New("save cancelled")
	}
	return fileio.WriteProjectDirectory(a.ctx, selected, documents)
}
