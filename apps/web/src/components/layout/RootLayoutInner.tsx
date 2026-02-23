"use client";

import type React from "react";
import { useState } from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import { RegisterModal } from "@/components/auth/RegisterModal";
import Sidebar from "@/components/layout/Sidebar";
import { AccountDrawer } from "@/components/ui/AccountDrawer";
import { AvatarButton } from "@/components/ui/AvatarButton";
import { Footer } from "@/components/ui/Footer";
import { NavBar } from "@/components/ui/NavBar";
import { OnboardingOverlay } from "@/components/ui/OnboardingOverlay";
import { ToastViewport } from "@/components/ui/Toasts";

export default function RootLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);

  const handleAuthSuccess = () => {
    // Modal will close automatically, can add toast here if desired
  };

  const handleSwitchToRegister = () => {
    setLoginModalOpen(false);
    setRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
  };

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

      <div className="fixed top-3 right-2 md:right-3 z-55">
        <AvatarButton
          onClick={() => setAccountDrawerOpen(true)}
          label="Open account drawer"
        />
      </div>

      <div className="fixed right-2 md:right-3 bottom-[calc(var(--app-footer-offset)+0.5rem)] z-55 flex items-end">
        <OnboardingOverlay />
      </div>

      <AccountDrawer
        open={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        onOpenLogin={() => {
          setAccountDrawerOpen(false);
          setLoginModalOpen(true);
        }}
        onOpenRegister={() => {
          setAccountDrawerOpen(false);
          setRegisterModalOpen(true);
        }}
      />

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />

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
