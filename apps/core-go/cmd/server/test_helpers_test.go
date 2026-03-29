package main

import (
	"testing"

	"github.com/gorilla/websocket"
)

func resetGatewayTestState(t *testing.T) {
	t.Helper()

	prevAppDeps := appDeps
	prevCfg := cfg
	prevOrchClient := orchClient
	prevBusClient := busClient
	prevRateLimitRDB := rateLimitRDB
	prevVADProc := vadProc
	prevUpgrader := upgrader
	prevAudioSem := audioSem

	appDeps = &gatewayDependencies{}
	cfg = nil
	orchClient = nil
	busClient = nil
	rateLimitRDB = nil
	vadProc = nil
	upgrader = websocket.Upgrader{}
	audioSem = nil

	t.Cleanup(func() {
		appDeps = prevAppDeps
		cfg = prevCfg
		orchClient = prevOrchClient
		busClient = prevBusClient
		rateLimitRDB = prevRateLimitRDB
		vadProc = prevVADProc
		upgrader = prevUpgrader
		audioSem = prevAudioSem
	})
}
