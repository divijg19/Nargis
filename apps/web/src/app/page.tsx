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
    <main className="min-h-screen">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <div className="text-center animate-fade-in">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 mb-8 shadow-lg">
            <span className="text-4xl" aria-hidden="true">🌸</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Nargis</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Your AI-powered productivity companion. Manage tasks, build habits, focus better, and achieve more with intelligent assistance.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="mr-2">📊</span>
              Open Dashboard
            </Link>
            <Link
              href="/tasks"
              className="inline-flex items-center px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span className="mr-2">✓</span>
              View Tasks
            </Link>
          </div>

          {/* API Status */}
          <div className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className={`w-2 h-2 rounded-full mr-2 ${apiStatus === 'ok' ? 'bg-green-500 animate-pulse' :
              apiStatus === 'checking...' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              API Status: <span className="font-mono font-medium">{apiStatus}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: "✓", title: "Smart Tasks", desc: "Organize and prioritize your work", href: "/tasks", color: "blue" },
            { icon: "🔥", title: "Habit Tracking", desc: "Build lasting positive behaviors", href: "/habits", color: "orange" },
            { icon: "🍅", title: "Focus Timer", desc: "Boost productivity with Pomodoro", href: "/pomodoro", color: "red" },
            { icon: "🤖", title: "AI Assistant", desc: "Voice-powered task creation", href: "#voice", color: "purple" },
          ].map((feature, index) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-${feature.color}-100 dark:bg-${feature.color}-900/30 mb-4 group-hover:scale-110 transition-transform`}>
                <span className="text-2xl" aria-hidden="true">{feature.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {feature.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Voice Assistant Section */}
      <div id="voice" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 md:p-12 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Try Voice Assistant 🎤
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Ask Nargis anything. Create tasks, get insights, or just have a conversation.
            </p>
          </div>

          <div className="flex flex-col items-center space-y-6">
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
              className={`relative px-12 py-6 text-xl font-semibold rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed ${isRecording
                ? "bg-red-500 text-white hover:bg-red-600 scale-105"
                : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105"
                }`}
            >
              {isRecording ? (
                <span className="flex items-center">
                  <span className="animate-pulse mr-2">●</span>
                  Stop Recording
                </span>
              ) : (
                <span className="flex items-center">
                  🎤 Ask Nargis
                </span>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                }`} />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {statusText}
              </p>
            </div>

            {permissionDenied && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">
                  Microphone permission denied. Please enable it in your browser settings.
                </p>
              </div>
            )}
          </div>

          {aiResponse && (
            <div
              className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 animate-slide-up"
              aria-live="polite"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xl" aria-hidden="true">🌸</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Nargis says:
                  </h3>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {aiResponse}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
