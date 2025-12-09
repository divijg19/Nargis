package vad

import (
	"math"
)

// Config holds VAD configuration
type Config struct {
	SampleRate      int
	FrameSize       int // Number of samples per frame
	EnergyThreshold float64
}

// DefaultConfig returns a standard configuration for 16kHz audio
func DefaultConfig() Config {
	return Config{
		SampleRate:      16000,
		FrameSize:       512,   // ~32ms at 16kHz
		EnergyThreshold: 0.005, // Conservative threshold, tune based on mic input
	}
}

// Processor handles the VAD logic
type Processor struct {
	config Config
	buffer []int16
}

func NewProcessor(cfg Config) *Processor {
	return &Processor{
		config: cfg,
		buffer: make([]int16, 0, cfg.FrameSize),
	}
}

// Process checks if the audio chunk contains speech.
// It returns true if speech is detected, and the audio bytes to forward.
// Currently, this is a simple pass-through that calculates RMS energy.
// In a real implementation, you might buffer silence and only send when speech starts.
func (p *Processor) Process(audio []byte) (bool, []byte) {
	// Convert bytes to int16 samples (assuming 16-bit PCM)
	samples := bytesToInt16(audio)

	if len(samples) == 0 {
		return false, nil
	}

	energy := calculateRMS(samples)

	// If energy is above threshold, we consider it speech
	if energy > p.config.EnergyThreshold {
		return true, audio
	}

	return false, nil
}

func bytesToInt16(data []byte) []int16 {
	samples := make([]int16, len(data)/2)
	for i := 0; i < len(samples); i++ {
		// Little-endian conversion
		samples[i] = int16(data[i*2]) | int16(data[i*2+1])<<8
	}
	return samples
}

func calculateRMS(samples []int16) float64 {
	var sum float64
	for _, sample := range samples {
		// Normalize to -1.0 to 1.0 range
		val := float64(sample) / 32768.0
		sum += val * val
	}
	return math.Sqrt(sum / float64(len(samples)))
}
