"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";

const ChatPanel = dynamic(() => import("@/components/ui/ChatPanel"), {
  ssr: false,
});

import { VoiceInputButton } from "@/components/ui/VoiceInputButton";
import { useRealtime } from "@/contexts/RealtimeContext";

// Voice-optimized feature showcase
const _features = [
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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const _heroRef = useRef<HTMLDivElement | null>(null);

  // Centralized realtime context for recording and AI results
  const { isListening, startListening, stopListening } = useRealtime();

  // API base left for future health checks if needed

  const _handleToggleRecording = useCallback(async () => {
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

  // unified rendering handled by ChatPanel; page does not need local showMore/panel state

  return (
    <div className="relative h-full overflow-hidden">
      {/* Hero Section (center content + right aside) */}
      <section className="relative overflow-hidden h-full">
        <div className="relative z-10 max-w-7xl 2xl:max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-8 xl:px-12 h-full flex items-center">
          <div className="w-full h-full py-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-6 gap-x-6 lg:gap-x-8 h-full items-center">
              {/* Center column: Hero mic + ChatPanel */}
              <div className="order-2 lg:order-2 lg:col-span-7 h-full flex items-center justify-center">
                <div className="relative p-4 sm:p-6 surface-floating rounded-3xl border border-border/30 w-full max-w-xl sm:max-w-2xl lg:max-w-3xl h-full max-h-full overflow-hidden flex flex-col">
                  <div className="text-center mb-4 shrink-0">
                    <div className="flex items-center justify-center">
                      <VoiceInputButton
                        size="md"
                        iconSizeClass="w-16 h-16 sm:w-20 sm:h-20"
                        iconTranslateY={18}
                        showStatus={true}
                        statusInline={false}
                      />
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                    <ChatPanel
                      compact
                      merged
                      permissionDenied={permissionDenied}
                    />
                  </div>
                </div>
              </div>

              {/* Right column: Hero + Voice-First Productivity */}
              <div className="lg:order-3 order-3 lg:col-span-4 h-full flex flex-col justify-center overflow-y-auto">
                {/* Hero moved to right aside */}
                <div className="mb-4 sm:mb-6 text-left">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                    <span className="gradient-text">Speak</span>
                    <span className="text-foreground"> Your </span>
                    <span className="gradient-text">Productivity</span>
                  </h1>
                  <h2 className="text-base sm:text-lg font-semibold mt-1 sm:mt-2 text-foreground">
                    Meet{" "}
                    <strong className="font-semibold gradient-nargis">
                      Nargis
                    </strong>
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Your productivity management agent.
                  </p>
                </div>
                <div className="mb-4 text-left">
                  <h3 className="text-base sm:text-lg font-semibold gradient-nargis mb-2">
                    Voice-First Productivity
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Every feature designed for seamless voice interaction and
                    natural conversation.
                  </p>
                </div>
                {/* feature cards removed from right aside; reserved for left sidebar */}
                <div className="mt-2" />

                {/* Usage guidelines */}
                <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground space-y-3">
                  <h4 className="font-semibold text-foreground">
                    How to use Nargis
                  </h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      Click the microphone or press "Try Voice Assistant" to
                      start speaking.
                    </li>
                    <li>
                      Use short, conversational commands: e.g. "Create a task",
                      "Start Pomodoro", or "Track habit".
                    </li>
                    <li>
                      Try the example prompts above as starters and customize
                      them to your workflow.
                    </li>
                    <li>
                      Explore the dashboard for insights and manage sessions
                      from the sidebar.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
