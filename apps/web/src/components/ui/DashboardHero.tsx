"use client";

import { useEffect, useState } from "react";
// import ChatPanel from "./ChatPanel"; // Removed ChatPanel usage

export default function DashboardHero({ greeting }: { greeting?: string }) {
  const [fallbackGreeting, setFallbackGreeting] = useState("Good morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setFallbackGreeting("Good morning");
    else if (hour < 18) setFallbackGreeting("Good afternoon");
    else setFallbackGreeting("Good evening");
  }, []);

  const displayGreeting = greeting ?? fallbackGreeting;

  return (
    <section className="relative mb-4 w-full">
      <div className="w-full bg-card/60 backdrop-blur-md rounded-3xl p-4 shadow-lg border border-border flex items-center justify-between gap-4 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
              <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-violet-600 bg-clip-text text-transparent">
                {displayGreeting}!
              </span>
            </h2>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">
            Welcome back — here's a tailored overview of your day. Use voice
            commands anytime with the microphone.
          </p>
        </div>

        <div className="shrink-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={async () => {
              // Trigger morning briefing
              try {
                const token = localStorage.getItem("token");
                await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL}/v1/agent/trigger`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ trigger_type: "morning_briefing" }),
                  },
                );
              } catch (e) {
                console.error("Failed to trigger briefing", e);
              }
            }}
            className="text-xs text-center text-primary hover:underline"
          >
            Morning Briefing
          </button>
        </div>
      </div>
    </section>
  );
}
