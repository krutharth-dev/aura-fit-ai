"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  route?: string;
  source?: string;
  trace?: string[];
  createdAt?: number;
};

type ConversationSummary = {
  id: string;
  title: string;
  preview: string;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
};

const starterPrompts = [
  { label: "Build a workout plan", prompt: "Create a 4-day muscle-building plan for an intermediate lifter with full gym access, 60-minute sessions and no limitations.", icon: "01", category: "PROGRAM" },
  { label: "Train a body part", prompt: "I want to train a body part today.", icon: "02", category: "WORKOUT" },
  { label: "Improve my form", prompt: "Explain deadlift form with setup, execution, common mistakes and an easier regression.", icon: "03", category: "TECHNIQUE" },
  { label: "Plan progression", prompt: "How should I progress my main lifts when I reach the top of my rep range?", icon: "04", category: "PROGRESSION" },
  { label: "Calculate strength", prompt: "Estimate my 1RM from 100 kg x 5 reps.", icon: "05", category: "CALCULATOR" },
  { label: "Check recovery", prompt: "My legs are sore two days after training. Should I train them again today?", icon: "06", category: "RECOVERY" },
];

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "Your training workspace is ready. Start any workout conversation—from a complete program to exercise form, progression, strength calculations or recovery. What are we working on today?",
  route: "welcome",
};

function freshMessages() { return [{ ...welcomeMessage }]; }
function newMessageId() {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  return `local_${value}`;
}

function routeLabel(route?: string) {
  return ({ welcome: "READY", program: "PROGRAM", exercise: "FORM COACH", recovery: "RECOVERY", calculator: "TRAINING MATH", general: "COACH" } as Record<string, string>)[route ?? "general"] ?? "COACH";
}

function relativeDate(timestamp: number) {
  const age = Date.now() - timestamp;
  if (age < 60_000) return "Just now";
  if (age < 3_600_000) return `${Math.max(1, Math.floor(age / 60_000))}m ago`;
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(timestamp);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) || "AF").toUpperCase();
}

type AccountUser = { displayName: string; email: string };

type CoachClientProps = {
  user: AccountUser | null;
  signInPath: string;
  signOutPath: string;
};

export default function CoachClient({ user, signInPath, signOutPath }: CoachClientProps) {
  const [messages, setMessages] = useState<Message[]>(freshMessages);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openTrace, setOpenTrace] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const filteredConversations = conversations.filter((conversation) => {
    const query = conversationSearch.trim().toLowerCase();
    return !query || conversation.title.toLowerCase().includes(query) || conversation.preview.toLowerCase().includes(query);
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/conversations", { headers: { Accept: "application/json" } });
        const data = await response.json() as { conversations?: ConversationSummary[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load saved chats");
        const list = data.conversations ?? [];
        if (!active) return;
        setConversations(list);
        if (list[0]) {
          const detailResponse = await fetch(`/api/conversations/${encodeURIComponent(list[0].id)}`, { headers: { Accept: "application/json" } });
          const detail = await detailResponse.json() as { conversation?: { id: string; messages: Message[] }; error?: string };
          if (!detailResponse.ok || !detail.conversation) throw new Error(detail.error || "Could not open saved chat");
          if (!active) return;
          setActiveConversationId(detail.conversation.id);
          setMessages(detail.conversation.messages.length ? detail.conversation.messages : freshMessages());
        }
      } catch (error) {
        if (active) setHistoryNotice(error instanceof Error ? error.message : "Could not load saved chats");
      } finally {
        if (active) setHistoryLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function fetchConversations() {
    const response = await fetch("/api/conversations", { headers: { Accept: "application/json" } });
    const data = await response.json() as { conversations?: ConversationSummary[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load saved chats");
    const list = data.conversations ?? [];
    setConversations(list);
    return list;
  }

  async function loadConversation(id: string, closeSidebar = true) {
    if (loading) return;
    setHistoryNotice(null);
    const response = await fetch(`/api/conversations/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
    const data = await response.json() as { conversation?: { id: string; messages: Message[] }; error?: string };
    if (!response.ok || !data.conversation) {
      setHistoryNotice(data.error || "Could not open that chat");
      return;
    }
    setActiveConversationId(data.conversation.id);
    setMessages(data.conversation.messages.length ? data.conversation.messages : freshMessages());
    setOpenTrace(null);
    setInput("");
    if (closeSidebar) setHistoryOpen(false);
  }

  function newChat() {
    if (loading) return;
    setActiveConversationId(null);
    setMessages(freshMessages());
    setInput("");
    setOpenTrace(null);
    setHistoryNotice(null);
    setHistoryOpen(false);
  }

  async function ensureConversation(firstMessage: string) {
    if (activeConversationId) return activeConversationId;
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initial_message: firstMessage }),
    });
    const data = await response.json() as { conversation?: ConversationSummary; error?: string };
    if (!response.ok || !data.conversation) throw new Error(data.error || "Could not create a saved chat");
    setActiveConversationId(data.conversation.id);
    setConversations((current) => [data.conversation!, ...current]);
    return data.conversation.id;
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    setLoading(true);
    setHistoryNotice(null);
    try {
      const conversationId = await ensureConversation(clean);
      const userMessage: Message = { id: newMessageId(), role: "user", content: clean };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput("");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          history: nextMessages.slice(-10).map(({ role, content }) => ({ role, content })),
          thread_id: conversationId,
          conversation_id: conversationId,
        }),
      });
      const data = await response.json() as { answer?: string; route?: string; source?: string; trace?: string[]; persisted?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Chat request failed");
      setMessages((current) => [...current, {
        id: newMessageId(), role: "assistant", content: data.answer ?? "No answer was returned.",
        route: data.route, source: data.source, trace: data.trace,
      }]);
      if (data.persisted === false) setHistoryNotice("The answer was generated, but this exchange could not be saved. Please try again.");
      else await fetchConversations();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Please try again";
      setMessages((current) => [...current, { id: newMessageId(), role: "assistant", content: `I couldn’t complete that request: ${text}`, route: "general", source: "Request error" }]);
      setHistoryNotice(text);
    } finally {
      setLoading(false);
    }
  }

  async function renameChat(conversation: ConversationSummary) {
    const title = window.prompt("Rename conversation", conversation.title)?.trim();
    if (!title || title === conversation.title) return;
    const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
    });
    const data = await response.json() as { title?: string; error?: string };
    if (!response.ok) { setHistoryNotice(data.error || "Could not rename chat"); return; }
    setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, title: data.title ?? title } : item));
  }

  async function removeChat(conversation: ConversationSummary) {
    if (!window.confirm(`Delete “${conversation.title}” and all of its messages?`)) return;
    const response = await fetch(`/api/conversations/${encodeURIComponent(conversation.id)}`, { method: "DELETE" });
    if (!response.ok) { setHistoryNotice("Could not delete chat"); return; }
    const remaining = conversations.filter((item) => item.id !== conversation.id);
    setConversations(remaining);
    if (activeConversationId === conversation.id) {
      if (remaining[0]) await loadConversation(remaining[0].id, false);
      else newChat();
    }
  }

  function onSubmit(event: FormEvent) { event.preventDefault(); void sendMessage(input); }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <aside className={`sidebar ${historyOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>A</span></div>
          <div><p className="brand-name">AURA FIT</p><p className="brand-subtitle">AI TRAINING COACH</p></div>
          <button className="close-sidebar" onClick={() => setHistoryOpen(false)} aria-label="Close navigation">×</button>
        </div>
        <button className="new-chat" onClick={newChat}><span>+</span> New conversation</button>

        <label className="conversation-search">
          <span aria-hidden="true">⌕</span>
          <input value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
        </label>

        <nav className="conversation-list" aria-label="Saved conversation history">
          <p className="nav-label">{user ? "YOUR CHATS" : "GUEST CHATS"}</p>
          {historyLoading ? <p className="history-empty">Loading your conversations…</p> : filteredConversations.length ? filteredConversations.map((conversation) => (
            <div className="history-entry" key={conversation.id}>
              <button className={`history-item ${conversation.id === activeConversationId ? "active" : ""}`} onClick={() => void loadConversation(conversation.id)}>
                <span className="history-icon">⌁</span>
                <span><strong>{conversation.title}</strong><small>{conversation.messageCount} messages · {relativeDate(conversation.updatedAt)}</small></span>
              </button>
              <div className="history-actions">
                <button onClick={() => void renameChat(conversation)} aria-label={`Rename ${conversation.title}`} title="Rename">✎</button>
                <button onClick={() => void removeChat(conversation)} aria-label={`Delete ${conversation.title}`} title="Delete">×</button>
              </div>
            </div>
          )) : <p className="history-empty">{conversations.length ? "No conversations match your search." : "No saved chats yet. Your next conversation will appear here automatically."}</p>}
        </nav>

        <div className="system-card">
          <div className="system-card-top"><span className="pulse"><i /></span><span>{user ? "ACCOUNT SYNC ACTIVE" : "GUEST MODE"}</span></div>
          <div className="system-metric"><span>Conversation memory</span><strong>Durable</strong></div>
          <div className="system-metric"><span>History scope</span><strong>{user ? "All devices" : "This browser"}</strong></div>
        </div>

        <div className={`account-card ${user ? "signed-in" : "guest"}`}>
          <div className="account-avatar">{user ? initials(user.displayName) : "G"}</div>
          <div className="account-copy">
            <strong>{user ? user.displayName : "Guest workspace"}</strong>
            <small>{user ? user.email : "History stays on this browser"}</small>
          </div>
          {user
            ? <a href={signOutPath} className="account-action" title="Sign out" aria-label="Sign out">↗</a>
            : <a href={signInPath} className="account-signin">Sign in / Sign up</a>}
        </div>
      </aside>

      {historyOpen && <button className="sidebar-scrim" onClick={() => setHistoryOpen(false)} aria-label="Close navigation overlay" />}
      <section className="chat-panel">
        <header className="topbar">
          <button className="menu-button" onClick={() => setHistoryOpen(true)} aria-label="Open navigation">☰</button>
          <div className="agent-heading"><div className="agent-orb"><span>✦</span></div><div><h1>AURA FIT <em>PRO</em></h1><p><span className="online-dot" /> COACH ONLINE <i /> {user ? "ACCOUNT SYNCED" : "GUEST WORKSPACE"}</p></div></div>
          <div className="topbar-actions">
            {!user && <a className="topbar-signin" href={signInPath}>Sign in</a>}
            <button className="details-button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} aria-controls="architecture-panel">{showDetails ? "Hide" : "How it works"}</button>
          </div>
        </header>

        {showDetails && <div className="architecture-panel" id="architecture-panel">
          <strong>COACHING ENGINE</strong><span>Workout planning, technique, progression, strength calculations and recovery routing</span><i />
          <strong>SECURE MEMORY</strong><span>{user ? "Account-owned chat history synced across signed-in devices" : "Private guest history stored for this browser"}</span>
        </div>}

        {historyNotice && <div className="history-notice" role="status"><span>{historyNotice}</span><button onClick={() => setHistoryNotice(null)} aria-label="Dismiss notice">×</button></div>}
        <div className="message-scroll" aria-live="polite" aria-busy={loading}>
          <div className="date-divider"><span>{activeConversationId ? "SAVED CONVERSATION" : "NEW CONVERSATION"}</span></div>
          {messages.map((message, index) => (
            <div key={message.id} className={`message-row ${message.role}`}>
              {message.role === "assistant" && <div className="message-avatar">✦</div>}
              <div className="message-column">
                {message.role === "assistant" && <div className="message-meta"><span>AURA FIT</span><em>{routeLabel(message.route)}</em></div>}
                <div className="message-bubble">{message.content.split("\n").map((line, lineIndex, lines) => <span key={lineIndex}>{line}{lineIndex < lines.length - 1 && <br />}</span>)}</div>
                {message.source && <small className="source-label">↳ {message.source}</small>}
                {message.trace?.length ? <div className="trace-wrap">
                  <button className="trace-toggle" onClick={() => setOpenTrace(openTrace === message.id ? null : message.id)} aria-expanded={openTrace === message.id}>{openTrace === message.id ? "Hide" : "View"} agent trace</button>
                  {openTrace === message.id && <ol className="trace-list">{message.trace.map((step) => <li key={step}>{step}</li>)}</ol>}
                </div> : null}
                {index === 0 && messages.length === 1 && <>
                  {!user && <div className="sync-banner"><div><strong>Keep your training history everywhere</strong><span>Sign in or create an account to access your chats across devices.</span></div><a href={signInPath}>Continue with ChatGPT</a></div>}
                  <p className="prompt-heading">CHOOSE A COACHING WORKFLOW</p>
                  <div className="prompt-grid">{starterPrompts.map((item) => <button key={item.label} onClick={() => void sendMessage(item.prompt)}><span>{item.icon}</span><em>{item.category}</em><strong>{item.label}</strong><small>{item.prompt}</small><i>↗</i></button>)}</div>
                </>}
              </div>
            </div>
          ))}
          {loading && <div className="message-row assistant"><div className="message-avatar">✦</div><div className="message-column"><div className="message-meta"><span>AURA FIT</span><em>ROUTING</em></div><div className="message-bubble typing"><i /><i /><i /></div></div></div>}
          <div ref={endRef} />
        </div>

        <div className="composer-wrap">
          <form className="composer" onSubmit={onSubmit}>
            <textarea value={input} maxLength={2000} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit(event as unknown as FormEvent); } }} placeholder="Ask about workouts, form, progression or recovery..." rows={1} aria-label="Message AURA FIT" />
            <button type="submit" disabled={!input.trim() || loading} aria-label="Send message">↑</button>
          </form>
          <p className="composer-note"><span>✦</span> {user ? "Chats securely sync to your account" : "Guest chats are saved on this browser"} · Educational guidance, not medical diagnosis <i /> Enter to send</p>
        </div>
      </section>
    </main>
  );
}
