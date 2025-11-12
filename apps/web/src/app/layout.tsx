import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import React from "react";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import Sidebar from "@/components/layout/Sidebar";
import MobileNavToggle from "@/components/layout/MobileNavToggle";
import RootLayoutInner from "@/components/layout/RootLayoutInner";
// AI modal is now rendered inline in the hero via ChatPanel

import { Footer } from "@/components/ui/Footer";
import { NavBar } from "@/components/ui/NavBar";
import { ToastViewport } from "@/components/ui/Toasts";

// Define premium fonts optimized for voice-first interfaces
const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
	preload: true,
	weight: ["300", "400", "500", "600", "700"],
});

const jetbrains_mono = JetBrains_Mono({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-jetbrains-mono",
	preload: true,
	weight: ["400", "500", "600"],
});

// Enhanced metadata for voice-first AI productivity platform
export const metadata: Metadata = {
	title: "Nargis - Voice-First AI Productivity Companion",
	description:
		"Speak naturally to manage tasks, build habits, and boost productivity. A premium voice-first AI assistant that understands your workflow.",
	keywords: [
		"voice assistant",
		"AI productivity",
		"task management",
		"habit tracking",
		"voice-first",
		"minimalist design",
		"premium productivity",
	],
	authors: [{ name: "Divij Ganjoo" }],
	creator: "Divij Ganjoo",
	openGraph: {
		title: "Nargis - Voice-First AI Productivity Companion",
		description:
			"Speak naturally to manage tasks, build habits, and boost productivity.",
		type: "website",
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		title: "Nargis - Voice-First AI Productivity Companion",
		description:
			"Speak naturally to manage tasks, build habits, and boost productivity.",
	},
};

// Separate viewport configuration
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#6366f1" },
		{ media: "(prefers-color-scheme: dark)", color: "#6366f1" },
	],
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrains_mono.variable}`}>
			<head>
				<Script id="theme-init" strategy="beforeInteractive">
					{`try {
              const theme = localStorage.getItem('theme');
              const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              const shouldBeDark = theme === 'dark' || (!theme && prefersDark);
              if (shouldBeDark) {
                document.documentElement.classList.add('dark');
              }
            } catch (e) {}`}
				</Script>
			</head>
			<body
				className={`${inter.variable} ${jetbrains_mono.variable} font-sans antialiased min-h-screen transition-all duration-300`}
			>
				<AppProviders>
					{/* Client-managed layout (sidebar state lives in a client component) */}
					<RootLayoutInner>{children}</RootLayoutInner>
				</AppProviders>
			</body>
		</html>
	);
}

