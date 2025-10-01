"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export default function Home() {
  const [apiStatus, setApiStatus] = useState("checking...");
  const [isRecording, setIsRecording] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [statusText, setStatusText] = useState("Disconnected");
  const [permissionDenied, setPermissionDenied] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_PY_URL?.replace(/\/$/, "") || "";
  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

  // Fetch API health once on mount (ignore if env not set)
  useEffect(() => {
    if (!apiBase) {
      setApiStatus("no-api-url");
      return;
    }
    const controller = new AbortController();
    fetch(`${apiBase}/health`, { signal: controller.signal })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(res.statusText)),
      )
      .then((data) => setApiStatus(data.status || "unknown"))
      .catch(() => setApiStatus("unreachable"));
    return () => controller.abort();
  }, [apiBase]);

  const cleanup = useCallback((intent?: "normal" | "error") => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.close(1000, intent === "error" ? "error" : "normal");
      } catch {
        /* noop */
      }
    }
    socketRef.current = null;
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      cleanup("normal");
      setIsRecording(false);
      setStatusText("Processing...");
      return;
    }

    setAiResponse("");
    setStatusText("Connecting...");
    setPermissionDenied(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const socket = new WebSocket(wsBase);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatusText("Connected & Listening...");
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm",
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send("EOS");
          }
          setStatusText("Processing...");
        };

        socket.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            if (response.text) setAiResponse(response.text);
            else if (response.error) setAiResponse(`Error: ${response.error}`);
          } catch {
            setAiResponse(event.data);
          }
        };

        socket.onclose = () => {
          setStatusText((prev) =>
            prev === "Processing..." ? prev : "Disconnected",
          );
        };

        socket.onerror = () => {
          setStatusText("Connection Error");
          cleanup("error");
        };

        mediaRecorder.start(500);
        setIsRecording(true);
      };
    } catch (error) {
      console.error("Error accessing microphone:", error);
      if ((error as DOMException).name === "NotAllowedError") {
        setPermissionDenied(true);
      }
      setStatusText("Mic Error");
      cleanup("error");
    }
  }, [cleanup, isRecording, wsBase]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900"
      aria-live="polite"
    >
      <h1 className="text-5xl font-bold text-gray-800">Nargis</h1>
      <p className="mt-4 text-lg text-gray-600">
        Python API Status:{" "}
        <span className="font-mono bg-gray-200 p-1 rounded">{apiStatus}</span>
      </p>

      {/* Navigation Links */}
      <div className="mt-8 flex space-x-4">
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Dashboard
        </Link>
      </div>

      <div className="mt-12 flex flex-col items-center">
        <button
          onClick={handleToggleRecording}
          disabled={statusText === "Processing..."}
          aria-pressed={isRecording}
          aria-label={
            isRecording
              ? "Stop recording and process audio"
              : "Start recording a question for Nargis"
          }
          type="button"
          className={`px-8 py-4 text-xl font-semibold rounded-full shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording
              ? "bg-red-500 text-white animate-pulse"
              : "bg-indigo-600 text-white"
            }`}
        >
          {isRecording ? "Stop Recording" : "Ask Nargis"}
        </button>
        <p className="mt-4 text-center text-sm text-gray-500">
          Status: {statusText}
        </p>
        {permissionDenied && (
          <p className="mt-2 text-xs text-red-600">
            Microphone permission denied. Enable it in your browser settings.
          </p>
        )}
      </div>

      {aiResponse && (
        <div
          className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-2xl border border-gray-200 dark:border-gray-700"
          aria-live="polite"
        >
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            Nargis says:
          </h2>
          <div className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {aiResponse}
          </div>
        </div>
      )}
    </main>
  );
}
