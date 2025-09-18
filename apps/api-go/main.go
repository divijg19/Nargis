package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// The Upgrader takes a normal HTTP connection and "upgrades" it to a WebSocket connection.
var upgrader = websocket.Upgrader{
	// ReadBufferSize and WriteBufferSize specify the I/O buffer sizes.
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// CheckOrigin is crucial for security. It prevents cross-site scripting attacks.
	// For local development, we can allow all origins by returning true.
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// handleConnections is the function that will be called for each new client that connects.
func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade the initial GET request to a WebSocket connection.
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	// Make sure we close the connection when the function returns.
	defer ws.Close()

	fmt.Println("Client Connected!")

	// This is an infinite loop that will listen for new messages from the client.
	for {
		// ReadMessage blocks until a new message is received from the client.
		messageType, p, err := ws.ReadMessage()
		if err != nil {
			// If there's an error (like the client disconnecting), we log it and break the loop.
			log.Println("Read error:", err)
			break
		}
		// For now, we'll just log that we received a message.
		// `p` contains the actual audio data chunk from the browser.
		log.Printf("Message received. Type: %d, Size: %d bytes", messageType, len(p))
	}
}

func main() {
	// Configure the HTTP server to handle requests to "/ws" with our handleConnections function.
	http.HandleFunc("/ws", handleConnections)

	// Start the server on port 8080.
	log.Println("Go WebSocket server starting on :8080")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
