"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { NavBar } from "@/components/ui/NavBar";
import { Footer } from "@/components/ui/Footer";
import { ToastViewport } from "@/components/ui/Toasts";

export default function RootLayoutInner({ children }: { children: React.ReactNode }) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen">
            <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* NavBar receives a prop to toggle the sidebar on mobile */}
                <div className="fixed top-4 left-4 right-4 z-50 pointer-events-auto">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between">
                            <NavBar onMobileSidebarToggle={() => setMobileSidebarOpen((s) => !s)} />
                        </div>
                    </div>
                </div>

                <main id="main" className="flex-1 overflow-y-auto relative pt-16">
                    {children}
                </main>

                <Footer />
                <ToastViewport />
                <div id="voice-announcements" aria-live="polite" aria-atomic="true" className="sr-only" />
            </div>
        </div>
    );
}
