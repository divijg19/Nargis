"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// Voice-optimized feature showcase
const features = [
  {
    title: "Smart Tasks",
    desc: "Speak to create, organize, and complete tasks effortlessly",
    href: "/tasks",
    icon: "✓",
    color: "indigo",
    voiceCommand: '"Create a new task"',
  },
  {
    title: "Habit Building",
    desc: "Build lasting habits with voice-guided consistency tracking",
    href: "/habits",
    icon: "🔥",
    color: "orange",
    voiceCommand: '"Track my habits"',
  },
  {
    title: "Deep Focus",
    desc: "Voice-activated Pomodoro sessions for distraction-free work",
    href: "/pomodoro",
    icon: "🍅",
    color: "emerald",
    voiceCommand: '"Start a focus session"',
  },
  {
    title: "Insights Hub",
    desc: "AI-powered productivity insights and performance analytics",
    href: "/dashboard",
    icon: "📊",
    color: "violet",
    voiceCommand: '"Show my dashboard"',
  },
];

export default function Home() {
  const [apiStatus, setApiStatus] = useState("checking...");
  const [isRecording, setIsRecording] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [statusText, setStatusText] = useState("Ready to listen");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_PY_URL?.replace(/\/$/, "") || "";
  const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";

  // Enhanced API health check
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
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsRecording(false);
    setIsThinking(false);

    if (intent === "error") {
      setStatusText("Connection lost");
    } else {
      setStatusText("Ready to listen");
    }
  }, []);

  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      cleanup("normal");
      return;
    }

    // Reset states for new session
    setAiResponse("");
    setPermissionDenied(false);
    setStatusText("Requesting microphone access...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      setStatusText("Connecting to Nargis...");

      // Enhanced WebSocket connection
      const ws = new WebSocket(wsBase);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatusText("🎤 Listening... Speak now");
        setIsRecording(true);

        // Enhanced MediaRecorder with better audio quality
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          setIsRecording(false);
          setIsThinking(true);
          setStatusText("✨ Nargis is thinking...");
          ws.send("END_AUDIO");
        };

        mediaRecorder.start(100); // Capture in 100ms chunks for responsiveness
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "response") {
            setAiResponse(data.content);
            setIsThinking(false);
            setStatusText("Response received");
            cleanup("normal");
          } else if (data.type === "error") {
            setAiResponse("Sorry, I encountered an error. Please try again.");
            setIsThinking(false);
            setStatusText("Error occurred");
            cleanup("error");
          }
        } catch {
          setAiResponse(event.data);
          setIsThinking(false);
          setStatusText("Response received");
          cleanup("normal");
        }
      };

      ws.onerror = () => {
        setStatusText("Connection failed");
        cleanup("error");
      };

      ws.onclose = () => {
        if (isRecording || isThinking) {
          setStatusText("Connection closed");
          cleanup("error");
        }
      };
    } catch (error) {
      console.error("Microphone access denied:", error);
      setPermissionDenied(true);
      setStatusText("Microphone access denied");
      cleanup("error");
    }
  }, [isRecording, isThinking, cleanup, wsBase]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => cleanup("normal");
  }, [cleanup]);

  return (
    <main className="relative min-h-screen pt-16">
      {/* Hero Section - Voice-First Design */}
      <section className="relative overflow-hidden">
        {/* Seamless floating orbs with enhanced animations */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-40">
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-transparent rounded-full blur-3xl animate-float" />
        </div>
        <div className="absolute bottom-0 left-0 w-64 h-64 opacity-30">
          <div
            className="w-full h-full bg-gradient-to-tr from-accent/30 via-primary/20 to-transparent rounded-full blur-3xl animate-float"
            style={{ animationDelay: "2s" }}
          />
        </div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 opacity-20 -translate-x-1/2 -translate-y-1/2">
          <div
            className="w-full h-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-2xl animate-float"
            style={{ animationDelay: "4s" }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Modern Headlines - More refined */}
            <div className="mb-16 animate-fade-in">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance mb-8">
                <span className="gradient-text">Speak</span>
                <span className="text-foreground"> Your </span>
                <span className="gradient-text">Productivity</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Meet{" "}
                <strong className="font-semibold text-primary">Nargis</strong>,
                your voice-first AI companion. Manage tasks, build habits, and
                focus deeply—all through natural conversation.
              </p>
            </div>

            {/* AI Voice Interface - Modern & Minimalistic */}
            <div
              className="mb-16 animate-scale-in"
              style={{ animationDelay: "200ms" }}
            >
              <div className="max-w-3xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-semibold mb-3">
                    <span className="gradient-text">AI Voice Assistant</span>
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    Speak naturally. Nargis understands and responds.
                  </p>
                </div>

                {/* Voice Interface Card */}
                <div className="relative p-8 surface-floating rounded-2xl border border-border/50 mb-8">
                  {/* Voice Button */}
                  <div className="text-center mb-6">
                    <button
                      onClick={handleToggleRecording}
                      disabled={statusText === "✨ Nargis is thinking..."}
                      aria-pressed={isRecording}
                      aria-label={
                        isRecording
                          ? "Stop recording and process audio"
                          : "Start recording a voice command for Nargis"
                      }
                      type="button"
                      className={`
                        relative group transition-all duration-500 ease-out hover-lift
                        ${
                          isRecording
                            ? "bg-gradient-to-r from-red-500 to-pink-500 scale-110 animate-glow-pulse"
                            : isThinking
                              ? "bg-gradient-to-r from-violet-500 to-purple-500 scale-105 animate-glow-pulse"
                              : "bg-gradient-brand hover:scale-105"
                        }
                        w-24 h-24 sm:w-28 sm:h-28 rounded-full font-bold text-white
                        disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100
                        focus-visible surface-floating shadow-lg
                      `}
                    >
                      {/* Button Content */}
                      {isRecording ? (
                        <div className="flex flex-col items-center">
                          <div className="flex space-x-1 mb-1">
                            <div
                              className="w-1.5 h-6 bg-white rounded-full voice-wave"
                              style={{ animationDelay: "0ms" }}
                            />
                            <div
                              className="w-1.5 h-4 bg-white rounded-full voice-wave"
                              style={{ animationDelay: "150ms" }}
                            />
                            <div
                              className="w-1.5 h-8 bg-white rounded-full voice-wave"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                          <span className="text-xs font-medium">Listening</span>
                        </div>
                      ) : isThinking ? (
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 mb-1 relative">
                            <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                          <span className="text-xs font-medium">
                            Processing
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="text-2xl mb-1 transition-transform duration-300 group-hover:scale-110">
                            🎤
                          </div>
                          <span className="text-xs font-medium">Speak</span>
                        </div>
                      )}

                      {/* Ripple Effects */}
                      {isRecording && (
                        <>
                          <div className="absolute inset-0 rounded-full border-2 border-red-400/50 voice-ripple" />
                          <div
                            className="absolute inset-0 rounded-full border border-white/30 voice-ripple"
                            style={{ animationDelay: "0.5s" }}
                          />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status Display */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center space-x-3 mb-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          isRecording
                            ? "pulse-error"
                            : isThinking
                              ? "pulse-warning"
                              : "pulse-success"
                        }`}
                      />
                      <p className="text-sm font-medium text-muted-foreground">
                        {statusText}
                      </p>
                    </div>
                  </div>

                  {/* Voice Examples - Minimalistic */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-3 surface-elevated rounded-lg border border-border/50">
                      <span className="text-muted-foreground font-medium">
                        Try:
                      </span>
                      <div className="font-semibold text-foreground mt-1 text-sm">
                        "Create a task to review project"
                      </div>
                    </div>
                    <div className="p-3 surface-elevated rounded-lg border border-border/50">
                      <span className="text-muted-foreground font-medium">
                        Ask:
                      </span>
                      <div className="font-semibold text-foreground mt-1 text-sm">
                        "Show my habits progress"
                      </div>
                    </div>
                  </div>

                  {/* Permission Error */}
                  {permissionDenied && (
                    <div className="mt-6 p-4 glass bg-destructive/5 border border-destructive/20 rounded-xl animate-slide-up">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                          <span className="text-destructive text-sm">⚠️</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-destructive">
                            Microphone Access Required
                          </h3>
                          <p className="text-xs text-destructive/80 mt-1">
                            Please enable microphone permissions to use voice
                            features.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Response Section - Dedicated */}
                {aiResponse && (
                  <div className="animate-slide-up">
                    <div className="p-6 glass-strong rounded-2xl border border-border/50 surface-floating">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg">
                            <span
                              className="text-lg text-white"
                              aria-hidden="true"
                            >
                              🌸
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-foreground">
                              Nargis Response
                            </h3>
                            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                              AI
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap m-0">
                              {aiResponse}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Speech Recognition Status - Technical Details */}
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-3 surface-elevated rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">
                      Speech Recognition
                    </div>
                    <div
                      className={`text-sm font-semibold ${isRecording ? "text-success" : "text-muted-foreground"}`}
                    >
                      {isRecording ? "Active" : "Ready"}
                    </div>
                  </div>
                  <div className="p-3 surface-elevated rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">
                      Transcription
                    </div>
                    <div
                      className={`text-sm font-semibold ${isThinking ? "text-warning" : "text-muted-foreground"}`}
                    >
                      {isThinking ? "Processing" : "Standby"}
                    </div>
                  </div>
                  <div className="p-3 surface-elevated rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground mb-1 font-medium">
                      AI Status
                    </div>
                    <div className="text-sm font-semibold text-success">
                      Ready
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - Minimalistic */}
            <div
              className="max-w-2xl mx-auto mb-16 animate-slide-up"
              style={{ animationDelay: "400ms" }}
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Get Started
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explore Nargis features and boost your productivity
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/dashboard"
                  className="group p-4 surface-elevated rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover-lift"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <span className="text-lg" aria-hidden="true">
                        📊
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        Dashboard
                      </div>
                      <div className="text-xs text-muted-foreground">
                        View insights
                      </div>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/tasks"
                  className="group p-4 surface-elevated rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover-lift"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <span className="text-lg" aria-hidden="true">
                        ✓
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm">
                        Tasks
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Manage todos
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* API Status - Minimalistic */}
            <div className="text-center">
              <div className="inline-flex items-center px-3 py-2 surface-elevated rounded-full border border-border/50 text-xs">
                <div
                  className={`w-2 h-2 rounded-full mr-2 ${
                    apiStatus === "healthy"
                      ? "bg-success animate-pulse"
                      : apiStatus === "unreachable"
                        ? "bg-destructive"
                        : "bg-warning animate-pulse"
                  }`}
                />
                <span className="text-muted-foreground font-semibold">
                  AI:{" "}
                  {apiStatus === "healthy"
                    ? "Ready"
                    : apiStatus === "unreachable"
                      ? "Offline"
                      : "Connecting..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Modern & Minimalistic */}
      <section className="relative py-16 border-t border-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-semibold mb-4">
              <span className="gradient-text">Voice-First</span> Productivity
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every feature designed for seamless voice interaction and natural
              conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group p-5 surface-elevated rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                {/* Feature Icon - Smaller, more refined */}
                <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-105 transition-all duration-300">
                  <span className="text-xl" aria-hidden="true">
                    {feature.icon}
                  </span>
                </div>

                {/* Feature Content - More compact */}
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                  {feature.desc}
                </p>

                {/* Voice Command - Simplified */}
                <div className="p-2.5 surface-elevated rounded-lg border border-border/40">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">
                    Voice:
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {feature.voiceCommand}
                  </div>
                </div>

                {/* Subtle hover effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section className="relative py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative p-8 sm:p-12 overflow-hidden rounded-3xl surface-floating border border-border/30">
            {/* Dynamic background based on theme - ensuring proper contrast */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-indigo-700 to-violet-700"
              style={{ background: "var(--gradient-brand)" }}
            />

            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full blur-xl" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance text-white">
                Ready to transform your productivity?
              </h2>
              <p className="text-white/95 text-lg mb-8 max-w-2xl mx-auto">
                Join the voice-first productivity revolution. Start speaking
                your way to better workflows today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleToggleRecording}
                  type="button"
                  className="inline-flex items-center bg-white text-primary font-semibold px-8 py-4 rounded-xl hover:bg-white/90 transition-all duration-200 hover-lift shadow-lg"
                >
                  <span className="mr-3 text-lg" aria-hidden="true">
                    🎤
                  </span>
                  Try Voice Assistant
                </button>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-8 py-4 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200 hover-lift"
                >
                  <span className="mr-3 text-lg" aria-hidden="true">
                    🚀
                  </span>
                  Explore Features
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
