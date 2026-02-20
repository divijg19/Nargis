"use client";

import type React from "react";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Footer } from "@/components/ui/Footer";
import { NavBar } from "@/components/ui/NavBar";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { ToastViewport } from "@/components/ui/Toasts";
import { VoiceControl } from "@/components/ui/VoiceControl";

export default function RootLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <NavBar onMobileSidebarToggle={() => setMobileSidebarOpen((s) => !s)} />

        <main
          id="maincontent"
          className="flex-1 overflow-y-auto relative pt-16 px-4 sm:px-6"
        >
          {children}
        </main>

        <Footer />
        <VoiceControl />
        <OnboardingOverlay />
        <ToastViewport />
        <div
          id="voice-announcements"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
      </div>
    </div>
  );
}
