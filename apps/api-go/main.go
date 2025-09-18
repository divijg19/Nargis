package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	fmt.Println("Go backend running on :8080")
	http.ListenAndServe(":8080", nil)
}
