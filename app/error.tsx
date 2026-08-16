"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "client_error" }),
    }).catch(() => undefined);
  }, []);

  return <main className="error-shell">
    <div className="error-card"><span>!</span><p>SOMETHING WENT WRONG</p><h1>The coach hit a temporary problem.</h1><small>A privacy-safe error signal has been recorded. Your message content was not included.</small><button onClick={reset}>Try again</button><Link href="/">Start a new chat</Link></div>
  </main>;
}
