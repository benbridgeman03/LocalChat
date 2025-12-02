package main

import (
	"context"
	"udpserver/backend"
)

type App struct {
	ctx         context.Context
	PeerService *backend.PeerService
}

func NewApp() *App {
	return &App{
		PeerService: backend.NewPeerService("1054"),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.PeerService.SetContext(ctx)
}
