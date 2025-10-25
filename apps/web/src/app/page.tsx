"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { useRealtime } from "@/contexts/RealtimeContext";
import { sanitizeText } from "@/lib/sanitize";

// Voice-optimized feature showcase
const features = [
  {
    title: "Smart Tasks",
    desc: "Speak to create, organize, and complete tasks effortlessly",
    href: "/tasks",
    icon: "✓",
    voiceCommand: '"Create a new task"',
  },
  {
    title: "Habit Building",
    desc: "Build lasting habits with voice-guided consistency tracking",
    href: "/habits",
    icon: "🔥",
    voiceCommand: '"Track my habits"',
  },
  {
    title: "Deep Focus",
    desc: "Voice-activated Pomodoro sessions for distraction-free work",
    href: "/pomodoro",
    icon: "🍅",
    voiceCommand: '"Start a focus session"',
  },
  {
    title: "Insights Hub",
    desc: "AI-powered productivity insights and performance analytics",
    href: "/dashboard",
    icon: "📊",
    voiceCommand: '"Show my dashboard"',
  },
];

export default function Home() {
  const [apiStatus, setApiStatus] = useState("checking...");
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Centralized realtime context for recording and AI results
  const {
    isListening,
    startListening,
    stopListening,
    aiResponse,
    transcribedText,
    messages,
    setOpenConversation,
  } = useRealtime();

  const apiBase = process.env.NEXT_PUBLIC_API_PY_URL?.replace(/\/$/, "") || "";

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

  const refetchApiHealth = async () => {
    if (!apiBase) return;
    try {
      setApiStatus("checking...");
      const res = await fetch(`${apiBase}/health`);
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setApiStatus(data.status || "unknown");
    } catch {
      setApiStatus("unreachable");
    }
  };

  const handleToggleRecording = useCallback(async () => {
    if (isListening) {
      stopListening();
      return;
    }
    try {
      await startListening();
    } catch {
      // startListening will already push a toast; keep a simple visual fallback
      setPermissionDenied(true);
    }
  }, [isListening, startListening, stopListening]);

  const [showMore, setShowMore] = useState(false);
  const sanitizedAi = aiResponse ? sanitizeText(aiResponse) : "";
  const preview =
    sanitizedAi.length > 320 ? `${sanitizedAi.slice(0, 320)}…` : sanitizedAi;

  return (
    <main className="relative min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 opacity-40 pointer-events-none">
          <div className="w-full h-full bg-linear-to-br from-primary/30 via-accent/20 to-transparent rounded-full blur-3xl animate-float pointer-events-none" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-8">
              <span className="gradient-text">Speak</span>
              <span className="text-foreground"> Your </span>
              <span className="gradient-text">Productivity</span>
            </h1>
            <div className="flex flex-col items-center justify-center space-y-3">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
                Meet <strong className="font-semibold gradient-nargis">Nargis</strong>
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Your productivity management agent.
              </p>
            </div>
          </div>

          <div className="mt-12">
            <div className="relative p-10 surface-floating rounded-3xl border border-border/30 mb-8 max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center">
                  <VoiceInputButton size="lg" />
                </div>
              </div>

              <div className="text-center mb-6">
                {/* Live transcript preview while processing (status shown on the mic button) */}
                {transcribedText && !aiResponse && (
                  <div className="mt-4 p-3 bg-white/5 rounded-lg border border-border/20 text-sm text-foreground/90 whitespace-pre-wrap">
                    {sanitizeText(transcribedText, 2000)}
                  </div>
                )}
              </div>

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

              {aiResponse && (
                <div className="animate-slide-up mt-6">
                  <div className="p-6 bg-white/6 rounded-2xl border border-border/30 backdrop-blur-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow">
                        <span className="text-lg text-white" aria-hidden>
                          🌸
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-base font-semibold text-foreground">
                            Nargis
                          </h3>
                          <div className="text-xs text-muted-foreground px-2 py-1 rounded-full">
                            AI
                          </div>
                        </div>
                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                          {showMore ? sanitizedAi : preview}
                        </div>
                        {sanitizedAi.length > 320 && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => setShowMore((s) => !s)}
                              className="text-xs text-primary underline"
                            >
                              {showMore ? "Show less" : "Show more"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 surface-elevated rounded-lg border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">
                    Speech Recognition
                  </div>
                  <div
                    className={`text-sm font-semibold ${isListening ? "text-success" : "text-muted-foreground"}`}
                  >
                    {isListening ? "Active" : "Ready"}
                  </div>
                </div>
                <div className="p-3 surface-elevated rounded-lg border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">
                    Transcription
                  </div>
                  <div
                    className={`text-sm font-semibold ${transcribedText && !aiResponse ? "text-warning" : "text-muted-foreground"}`}
                  >
                    {transcribedText && !aiResponse
                      ? "Processing"
                      : "Standby"}
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

            {/* Quick Actions */}
            <div className="max-w-2xl mx-auto mb-16 animate-slide-up mt-8">
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
                      <span className="text-lg" aria-hidden>
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
                      <span className="text-lg" aria-hidden>
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

            {/* API Status or live preview if we have transcript/AI response */}
            <div className="text-center mt-6">
              {((messages && messages.length > 0) || transcribedText || aiResponse) ? (
                <div className="max-w-xl mx-auto p-3 rounded-lg text-sm text-foreground/90">
                  {/* Mini chat-style preview (show last 3 messages) */}
                  <div className="space-y-3">
                    {(messages && messages.length > 0 ? messages.slice(-3) : []).map((m) => (
                      <div key={m.ts} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                        <div className={m.role === "user" ? "max-w-[80%] bg-primary/90 text-white rounded-2xl px-4 py-2 text-sm shadow-sm" : "max-w-[80%] bg-surface-elevated rounded-2xl px-4 py-2 text-sm border border-border/30"}>
                          <div className="font-medium text-xs mb-1">{m.role === "user" ? "You" : "Nargis"}</div>
                          <div className="whitespace-pre-wrap text-sm">{sanitizeText(m.text, 1200)}</div>
                        </div>
                      </div>
                    ))}

                    {/* If no messages yet, fall back to single-item preview */}
                    {(!messages || messages.length === 0) && transcribedText && (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] bg-primary/90 text-white rounded-2xl px-4 py-2 text-sm shadow-sm">
                          <div className="font-medium">You</div>
                          <div className="mt-1 whitespace-pre-wrap">{sanitizeText(transcribedText ?? "", 1200)}</div>
                        </div>
                      </div>
                    )}

                    {(!messages || messages.length === 0) && aiResponse && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] bg-surface-elevated rounded-2xl px-4 py-2 text-sm border border-border/30">
                          <div className="font-medium text-muted-foreground">Nargis</div>
                          <div className="mt-1 whitespace-pre-wrap">{sanitizeText(aiResponse, 2000).slice(0, 800)}{aiResponse.length > 800 ? '…' : ''}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          // open the modal (the modal reads from messages) and focus
                          setOpenConversation(true);
                          setTimeout(() => {
                            const dialog = document.querySelector<HTMLElement>("[role=\"dialog\"]");
                            dialog?.focus();
                          }, 80);
                        }}
                        className="text-xs px-3 py-1 rounded-md bg-white/6 hover:bg-white/10"
                      >
                        Open conversation
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // When there's no live transcript or AI response, avoid showing
                // a redundant 'AI: Connecting' box. Only surface a compact
                // status when the API is explicitly healthy or unreachable.
                (apiStatus === "healthy" || apiStatus === "unreachable" || apiStatus === "no-api-url") ? (
                  <div className="inline-flex items-center px-3 py-2 surface-elevated rounded-full border border-border/50 text-xs gap-3">
                    <div className={`w-2 h-2 rounded-full ${apiStatus === "healthy" ? "bg-success animate-pulse" : apiStatus === "unreachable" ? "bg-destructive" : "bg-warning"}`} />
                    <span className="text-muted-foreground font-semibold">AI: {apiStatus === "healthy" ? "Ready" : apiStatus === "unreachable" ? "Offline" : "No API URL"}</span>
                    {apiStatus === "unreachable" && (
                      <button type="button" onClick={refetchApiHealth} className="ml-2 text-xs px-2 py-1 rounded-md bg-secondary/90 hover:bg-secondary/80">Retry</button>
                    )}
                  </div>
                ) : null
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
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
                <div className="w-12 h-12 rounded-lg bg-primary/10 mb-4 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-105 transition-all duration-300">
                  <span className="text-xl" aria-hidden>
                    {feature.icon}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                  {feature.desc}
                </p>
                <div className="p-2.5 surface-elevated rounded-lg border border-border/40">
                  <div className="text-xs text-muted-foreground mb-1 font-medium">
                    Voice:
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {feature.voiceCommand}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="relative py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative p-8 sm:p-12 overflow-hidden rounded-3xl surface-floating border border-border/30">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-balance">
                Ready to transform your productivity?
              </h2>
              <p className="text-lg mb-8 max-w-2xl mx-auto">
                Join the voice-first productivity revolution. Start speaking
                your way to better workflows today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleToggleRecording}
                  type="button"
                  className="btn btn-primary"
                >
                  <span className="mr-3 text-lg" aria-hidden>
                    🎤
                  </span>
                  Try Voice Assistant
                </button>
                <Link
                  href="/dashboard"
                  className="btn btn-secondary"
                >
                  <span className="mr-3 text-lg" aria-hidden>
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
