import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AURA FIT — AI Training Coach",
  description: "An agentic AI gym coach for workout programming, exercise guidance, progression and recovery.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
