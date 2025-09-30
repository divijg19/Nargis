import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from '@/components/layout/AppProviders';
import { NavBar } from '@/components/ui/NavBar';
import { ToastViewport } from '@/components/ui/Toasts';

// Define the primary and monospaced fonts for the application
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter", // CSS variable for the sans-serif font
});

const jetbrains_mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono", // CSS variable for the mono font
});

// Define the application's metadata for SEO and branding
export const metadata: Metadata = {
  title: "Nargis - AI Productivity Companion",
  description:
    "A real-time AI productivity platform unifying voice, tasks, and journaling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrains_mono.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen`}>
        <AppProviders>
          <NavBar />
          <main id="main" className="pt-2 pb-10">
            {children}
          </main>
          <ToastViewport />
        </AppProviders>
      </body>
    </html>
  );
}
