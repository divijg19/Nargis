"use client";

import type React from "react";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { Footer } from "@/components/ui/Footer";
import { NavBar } from "@/components/ui/NavBar";
import { ToastViewport } from "@/components/ui/Toasts";

export default function RootLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <>
      <div className="h-screen grid grid-rows-[auto_1fr_auto] overflow-hidden">
        <NavBar onMobileSidebarToggle={() => setMobileSidebarOpen((s) => !s)} />

        <div className="min-h-0 grid grid-cols-1 md:grid-cols-[auto_1fr] overflow-hidden">
          <Sidebar
            mobileOpen={mobileSidebarOpen}
            onMobileClose={() => setMobileSidebarOpen(false)}
          />

          <main
            id="maincontent"
            className="min-h-0 overflow-y-auto px-4 sm:px-6 pt-16 pb-24"
          >
            {children}
          </main>
        </div>

        <Footer />
      </div>

      <ToastViewport />
      <div
        id="voice-announcements"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
