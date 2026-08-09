import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://mce-agentic-ai.kruthajn777.chatgpt.site"),
  title: "AURA FIT — AI Training Coach",
  description: "A professional agentic AI training coach for personalised programs, exercise guidance, progression, calculations and safety-aware recovery support.",
  applicationName: "AURA FIT",
  keywords: ["AI training coach", "workout planner", "fitness agent", "LangGraph", "ChromaDB"],
  authors: [{ name: "Kishan B Gowda" }, { name: "Krutharth Prashanth Gowda" }],
  manifest: "/site.webmanifest",
  openGraph: {
    title: "AURA FIT — AI Training Coach",
    description: "Personalised workout programming with transparent routing and safety guardrails.",
    type: "website",
  },
  twitter: { card: "summary", title: "AURA FIT — AI Training Coach", description: "Personalised workout programming with transparent routing and safety guardrails." },
  robots: { index: true, follow: true },
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#090a0e", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
