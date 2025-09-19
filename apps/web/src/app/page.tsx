"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  // State for the Python API health check
  const [apiStatus, setApiStatus] = useState("checking...");

  // New state for our voice connection
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Use useRef to hold references to the WebSocket and MediaRecorder
  // This prevents them from being re-created on every render.
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    // This is the health check for the Python API. It runs once on page load.
    fetch(`${process.env.NEXT_PUBLIC_API_PY_URL}/health`)
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status || "error"))
      .catch(() => setApiStatus("unreachable"));
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      // --- STOP RECORDING ---
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (socketRef.current) {
        socketRef.current.close();
      }
      setIsRecording(false);
    } else {
      // --- START RECORDING ---
      try {
        // 1. Get user's microphone stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // 2. Create a new WebSocket connection to our Go server
        const socket = new WebSocket("ws://localhost:8080/ws");
        socketRef.current = socket;

        // 3. Set up WebSocket event handlers
        socket.onopen = () => {
          console.log("WebSocket connection established.");
          setIsConnected(true);

          // 4. Once connected, create the MediaRecorder
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          // 5. This event fires whenever a chunk of audio is ready
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              // Send the audio chunk to the Go server
              socket.send(event.data);
            }
          };

          // 6. Start recording. The timeslice (e.g., 500ms) determines how often ondataavailable fires.
          mediaRecorder.start(500);
          setIsRecording(true);
        };

        socket.onclose = () => {
          console.log("WebSocket connection closed.");
          setIsConnected(false);
          setIsRecording(false);
        };

        socket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setIsConnected(false);
          setIsRecording(false);
        };
      } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Could not access microphone. Please check permissions.");
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-5xl font-bold text-gray-800">Nargis</h1>
      <p className="mt-4 text-lg text-gray-600">
        Python API Status:{" "}
        <span className="font-mono bg-gray-200 p-1 rounded">{apiStatus}</span>
      </p>

      <div className="mt-12">
        <button
          type="button"
          onClick={handleToggleRecording}
          className={`px-8 py-4 text-xl font-semibold rounded-full shadow-lg transition-transform transform hover:scale-105 ${
            isRecording ? "bg-red-500 text-white" : "bg-indigo-600 text-white"
          }`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          Connection Status: {isConnected ? "Connected" : "Disconnected"}
        </p>
      </div>
    </main>
  );
}
