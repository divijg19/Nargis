import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
      <body
        className={`${inter.variable} ${jetbrains_mono.variable} font-sans antialiased`}
      >
        {/* The 'children' prop will be your page.tsx component */}
        {children}
      </body>
    </html>
  );
}
