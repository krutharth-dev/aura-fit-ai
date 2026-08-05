"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  route?: string;
  source?: string;
};

const starterPrompts = [
  {
    label: "Train a body part",
    prompt: "I want to train back today.",
    icon: "01",
  },
  {
    label: "Build my program",
    prompt: "Create a 4-day muscle-building plan for an intermediate lifter with full gym access and 60-minute sessions.",
    icon: "02",
  },
  {
    label: "Ask a gym doubt",
    prompt: "How long should I rest between sets for muscle growth?",
    icon: "03",
  },
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hey — I’m AURA FIT, your AI training coach. Tell me a body part and I’ll ask how many exercises you want, or ask me about programs, form, progression, training numbers, and recovery. What are we working on today?",
    route: "welcome",
  },
];

function routeLabel(route?: string) {
  const labels: Record<string, string> = {
    welcome: "READY",
    program: "PROGRAM",
    exercise: "FORM COACH",
    recovery: "RECOVERY",
    calculator: "TRAINING MATH",
    general: "COACH",
  };
  return labels[route ?? "general"] ?? "COACH";
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const messageId = useRef(2);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;

    const userMessage: Message = {
      id: messageId.current++,
      role: "user",
      content: clean,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: nextMessages.slice(-8).map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");
      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: messageId.current++,
          role: "assistant",
          content: data.answer,
          route: data.route,
          source: data.source,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: messageId.current++,
          role: "assistant",
          content:
            "I’m in offline-safe mode right now. I can still build core programs, answer common exercise questions, and estimate training numbers. Add your Groq API key to enable live open-ended coaching.",
          route: "general",
          source: "Offline fallback",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(input);
  }

  function newChat() {
    setMessages(initialMessages);
    setInput("");
    setHistoryOpen(false);
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <aside className={`sidebar ${historyOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>A</span></div>
          <div>
            <p className="brand-name">AURA FIT</p>
            <p className="brand-subtitle">AI TRAINING COACH</p>
          </div>
          <button className="close-sidebar" onClick={() => setHistoryOpen(false)} aria-label="Close navigation">×</button>
        </div>

        <button className="new-chat" onClick={newChat}>
          <span>+</span> New conversation
        </button>

        <nav className="conversation-list" aria-label="Conversation history">
          <p className="nav-label">TODAY</p>
          <button className="history-item active">
            <span className="history-icon">⌁</span>
            <span><strong>Build today’s workout</strong><small>Just now</small></span>
          </button>
          <button className="history-item" onClick={() => sendMessage("I want to train chest today") }>
            <span className="history-icon">⌁</span>
            <span><strong>Chest workout</strong><small>Body-part builder</small></span>
          </button>
          <p className="nav-label older">EARLIER</p>
          <button className="history-item muted" onClick={() => sendMessage("Explain proper bench press form") }>
            <span className="history-icon">⌁</span>
            <span><strong>Bench press form</strong><small>Exercise guide</small></span>
          </button>
        </nav>

        <div className="system-card">
          <div className="system-card-top">
            <span className="pulse"><i /></span>
            <span>ALL SYSTEMS READY</span>
          </div>
          <div className="system-metric"><span>Coach engine</span><strong>5 routes</strong></div>
          <div className="system-metric"><span>Profile memory</span><strong>Active</strong></div>
          <div className="system-metric"><span>Workout coverage</span><strong>14 groups</strong></div>
        </div>

        <div className="team-card">
          <p>PROJECT TEAM · 2 MEMBERS</p>
          <div><span>01</span><strong>Name to be added</strong></div>
          <div><span>02</span><strong>Name to be added</strong></div>
        </div>
      </aside>

      {historyOpen && <button className="sidebar-scrim" onClick={() => setHistoryOpen(false)} aria-label="Close navigation overlay" />}

      <section className="chat-panel">
        <header className="topbar">
          <button className="menu-button" onClick={() => setHistoryOpen(true)} aria-label="Open navigation">☰</button>
          <div className="agent-heading">
            <div className="agent-orb"><span>✦</span></div>
            <div>
              <h1>AURA FIT</h1>
              <p><span className="online-dot" /> COACH ONLINE <i /> SAFETY GUARD ACTIVE</p>
            </div>
          </div>
          <button className="details-button" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? "Hide" : "How it works"}
          </button>
        </header>

        {showDetails && (
          <div className="architecture-strip">
            <span><b>1</b> Assess</span><i>→</i>
            <span><b>2</b> Route</span><i>→</i>
            <span><b>3</b> Coach</span><i>→</i>
            <span><b>4</b> Remember</span>
          </div>
        )}

        <div className="message-scroll" aria-live="polite">
          <div className="date-divider"><span>TODAY</span></div>

          {messages.map((message, index) => (
            <div key={message.id} className={`message-row ${message.role}`}>
              {message.role === "assistant" && <div className="message-avatar">✦</div>}
              <div className="message-column">
                {message.role === "assistant" && (
                  <div className="message-meta">
                    <span>AURA FIT</span>
                    <em>{routeLabel(message.route)}</em>
                  </div>
                )}
                <div className="message-bubble">
                  {message.content.split("\n").map((line, lineIndex) => (
                    <span key={lineIndex}>{line}{lineIndex < message.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
                {message.source && <small className="source-label">↳ {message.source}</small>}
                {index === 0 && messages.length === 1 && (
                  <div className="prompt-grid">
                    {starterPrompts.map((item) => (
                      <button key={item.label} onClick={() => sendMessage(item.prompt)}>
                        <span>{item.icon}</span>
                        <strong>{item.label}</strong>
                        <small>{item.prompt}</small>
                        <i>↗</i>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row assistant">
              <div className="message-avatar">✦</div>
              <div className="message-column">
                <div className="message-meta"><span>AURA FIT</span><em>ROUTING</em></div>
                <div className="message-bubble typing"><i /><i /><i /></div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={onSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit(event as unknown as FormEvent);
                }
              }}
              placeholder="Ask about workouts, form, progression or recovery..."
              rows={1}
              aria-label="Message AURA FIT"
            />
            <button type="submit" disabled={!input.trim() || loading} aria-label="Send message">↑</button>
          </form>
          <p className="composer-note"><span>✦</span> Educational fitness guidance — not medical diagnosis <i /> Enter to send · Shift + Enter for new line</p>
        </div>
      </section>
    </main>
  );
}
