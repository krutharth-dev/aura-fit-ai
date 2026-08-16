"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  defaultFitnessProfile,
  equipmentLabels,
  equipmentOptions,
  experienceLabels,
  experienceLevels,
  fitnessGoalLabels,
  fitnessGoals,
  type FitnessProfile,
  type FitnessProfileInput,
} from "../lib/fitness-profile";

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
  { label: "Check recovery", prompt: "I am still sore two days after training. Should I train again today?", icon: "06", category: "RECOVERY" },
];

const bodyPartReplies = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Arms", "Quads", "Hamstrings", "Glutes", "Legs", "Calves", "Core", "Forearms", "Full body"];
const exerciseCountReplies = ["3", "4", "5", "6", "7", "8"];

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "Your training workspace is ready. Start any workout conversation—from a complete program to exercise form, progression, strength calculations or recovery. What are we working on today?",
  route: "welcome",
};

function freshMessages() { return [{ ...welcomeMessage }]; }
function suggestedReplies(message: Message, isLatest: boolean) {
  if (!isLatest || message.role !== "assistant") return [];
  if (message.content.includes("Which body part or muscle group would you like to train")) return bodyPartReplies;
  if (message.content.includes("How many exercises would you like in this session") || message.content.includes("Choose between 3 and 8 exercises")) return exerciseCountReplies;
  return [];
}
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
  isAdmin: boolean;
  signInPath: string;
  signOutPath: string;
};

export default function CoachClient({ user, isAdmin, signInPath, signOutPath }: CoachClientProps) {
  const [messages, setMessages] = useState<Message[]>(freshMessages);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(Boolean(user));
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [openTrace, setOpenTrace] = useState<string | null>(null);
  const [profile, setProfile] = useState<FitnessProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(Boolean(user));
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileStep, setProfileStep] = useState(0);
  const [profileDraft, setProfileDraft] = useState<FitnessProfileInput>(defaultFitnessProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const filteredConversations = conversations.filter((conversation) => {
    const query = conversationSearch.trim().toLowerCase();
    return !query || conversation.title.toLowerCase().includes(query) || conversation.preview.toLowerCase().includes(query);
  });

  useEffect(() => {
    if (!user) return;
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
  }, [user]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/profile", { headers: { Accept: "application/json" } });
        const data = await response.json() as { profile?: FitnessProfile | null; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load your fitness profile");
        if (active) setProfile(data.profile ?? null);
      } catch (error) {
        if (active) setHistoryNotice(error instanceof Error ? error.message : "Could not load your fitness profile");
      } finally {
        if (active) setProfileLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);
  useEffect(() => {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "page_view" }),
    }).catch(() => undefined);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function fetchConversations() {
    if (!user) return [];
    const response = await fetch("/api/conversations", { headers: { Accept: "application/json" } });
    const data = await response.json() as { conversations?: ConversationSummary[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Could not load saved chats");
    const list = data.conversations ?? [];
    setConversations(list);
    return list;
  }

  async function loadConversation(id: string, closeSidebar = true) {
    if (loading || !user) return;
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
    if (!user) return null;
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
          thread_id: conversationId ?? `guest_${newMessageId()}`,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        }),
      });
      const data = await response.json() as { answer?: string; route?: string; source?: string; trace?: string[]; persisted?: boolean; error?: string };
      if (!response.ok) throw new Error(data.error || "Chat request failed");
      setMessages((current) => [...current, {
        id: newMessageId(), role: "assistant", content: data.answer ?? "No answer was returned.",
        route: data.route, source: data.source, trace: data.trace,
      }]);
      if (user && data.persisted === false) setHistoryNotice("The answer was generated, but this exchange could not be saved. Please try again.");
      else if (user) await fetchConversations();
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

  function openProfile() {
    if (!user) {
      window.location.assign(signInPath);
      return;
    }
    setProfileDraft(profile ? {
      goal: profile.goal,
      experience: profile.experience,
      daysPerWeek: profile.daysPerWeek,
      sessionMinutes: profile.sessionMinutes,
      equipment: profile.equipment,
      limitations: profile.limitations,
      preferredExercises: profile.preferredExercises,
    } : defaultFitnessProfile);
    setProfileStep(0);
    setProfileError(null);
    setProfileOpen(true);
  }

  async function saveProfile() {
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileDraft),
      });
      const data = await response.json() as { profile?: FitnessProfile; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error || "Could not save your fitness profile");
      setProfile(data.profile);
      setProfileOpen(false);
      setHistoryNotice("Fitness profile saved. AURA FIT will apply it automatically to future chats.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Could not save your fitness profile");
    } finally {
      setProfileSaving(false);
    }
  }

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
          <p className="nav-label">{user ? "YOUR CHATS" : "SIGN IN TO SAVE"}</p>
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
          )) : <p className="history-empty">{user ? (conversations.length ? "No conversations match your search." : "No saved chats yet. Your next conversation will appear here automatically.") : "Guest conversations are temporary. Sign in to keep private history linked only to your account."}</p>}
        </nav>

        <div className="system-card">
          <div className="system-card-top"><span className="pulse"><i /></span><span>{user ? "ACCOUNT SYNC ACTIVE" : "PRIVATE GUEST SESSION"}</span></div>
          <div className="system-metric"><span>Conversation memory</span><strong>{user ? "Durable" : "Not stored"}</strong></div>
          <div className="system-metric"><span>History scope</span><strong>{user ? "This account" : "Current session"}</strong></div>
          <button className={`profile-launch ${profile ? "complete" : ""}`} onClick={openProfile} disabled={profileLoading}>
            <span>{profile ? "✓" : "+"}</span>
            <span><strong>{profile ? "Training profile active" : "Set up training profile"}</strong><small>{profile ? `${fitnessGoalLabels[profile.goal]} · ${profile.daysPerWeek} days` : "Personalise every workout"}</small></span>
            <i>›</i>
          </button>
        </div>

        <div className={`account-card ${user ? "signed-in" : "guest"}`}>
          <div className="account-avatar">{user ? initials(user.displayName) : "G"}</div>
          <div className="account-copy">
            <strong>{user ? user.displayName : "Guest session"}</strong>
            <small>{user ? user.email : "No durable history"}</small>
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
          <div className="agent-heading"><div className="agent-orb"><span>✦</span></div><div><h1>AURA FIT <em>PRO</em></h1><p><span className="online-dot" /> COACH ONLINE <i /> {user ? "ACCOUNT SYNCED" : "TEMPORARY SESSION"}</p></div></div>
          <div className="topbar-actions">
            {!user && <a className="topbar-signin" href={signInPath}>Sign in</a>}
            <button className="profile-button" onClick={openProfile}>{profile ? "Edit profile" : "Set up profile"}</button>
            <button className="details-button" onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} aria-controls="architecture-panel">{showDetails ? "Hide" : "How it works"}</button>
          </div>
        </header>

        {showDetails && <div className="architecture-panel" id="architecture-panel" role="region" aria-label="How AURA FIT works">
          <strong>COACHING ENGINE</strong><span>Workout planning, technique, progression, strength calculations and recovery routing</span><i />
          <strong>SECURE MEMORY</strong><span>{user ? "Account-owned chat history synced across signed-in devices" : "Guest messages are not retained as durable history"}</span>
          <div className="architecture-team">
            <strong>PROJECT TEAM</strong>
            <span>Krutharth Prashanth Gowda <b>4MC24CS099 · CSE-B</b><em>•</em>Kishan B Gowda <b>4MC24CS097 · CSE-B</b></span>
            <a href="https://github.com/krutharth-dev/aura-fit-ai" target="_blank" rel="noreferrer">GitHub repository ↗</a>
          </div>
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
                {suggestedReplies(message, index === messages.length - 1).length > 0 && <div className="quick-replies" aria-label="Suggested replies">
                  {suggestedReplies(message, true).map((reply) => <button key={reply} type="button" disabled={loading} onClick={() => void sendMessage(reply)} aria-label={`Reply ${reply}`}>{reply}</button>)}
                </div>}
                {message.source && <small className="source-label">↳ {message.source}</small>}
                {message.trace?.length ? <div className="trace-wrap">
                  <button className="trace-toggle" onClick={() => setOpenTrace(openTrace === message.id ? null : message.id)} aria-expanded={openTrace === message.id}>{openTrace === message.id ? "Hide" : "View"} agent trace</button>
                  {openTrace === message.id && <ol className="trace-list">{message.trace.map((step) => <li key={step}>{step}</li>)}</ol>}
                </div> : null}
                {index === 0 && messages.length === 1 && <>
                  {!user && <div className="sync-banner"><div><strong>Private account-only history</strong><span>Guest chats disappear after this session. Sign in to save conversations that only your account can access.</span></div><a href={signInPath}>Sign in / Sign up</a></div>}
                  {!profileLoading && !profile && <div className="profile-banner"><div className="profile-banner-icon">◎</div><div><strong>Make every answer personal</strong><span>Set your goal, schedule, equipment and limitations once. AURA FIT will use them automatically in future chats.</span></div><button onClick={openProfile}>Build my profile</button></div>}
                  {profile && <div className="profile-active-strip"><span>✓</span><strong>PROFILE ACTIVE</strong><em>{fitnessGoalLabels[profile.goal]} · {profile.daysPerWeek} days · {profile.sessionMinutes} min · {equipmentLabels[profile.equipment]}</em><button onClick={openProfile}>Edit</button></div>}
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
          <p className="composer-note"><span>✦</span> {user ? "Chats securely sync only to your account" : "Guest chats are not saved"} · Educational guidance, not medical diagnosis <i /> <Link href="/privacy">Privacy</Link>{isAdmin && <> · <Link href="/admin">Owner console</Link></>} · Enter to send</p>
        </div>
      </section>

      {profileOpen && <div className="profile-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !profileSaving) setProfileOpen(false); }}>
        <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
          <header className="profile-modal-header">
            <div><span>PERSONALISED COACHING</span><h2 id="profile-title">Your training profile</h2><p>Step {profileStep + 1} of 4</p></div>
            <button onClick={() => setProfileOpen(false)} disabled={profileSaving} aria-label="Close fitness profile">×</button>
          </header>
          <div className="profile-progress" aria-hidden="true"><i style={{ width: `${((profileStep + 1) / 4) * 100}%` }} /></div>

          <div className="profile-modal-body">
            {profileStep === 0 && <div className="profile-step">
              <div className="profile-step-heading"><span>01</span><div><h3>What is your main goal?</h3><p>This sets your training emphasis, rep ranges and progression style.</p></div></div>
              <div className="profile-choice-grid goal-grid">
                {fitnessGoals.map((goal) => <button key={goal} type="button" className={profileDraft.goal === goal ? "selected" : ""} onClick={() => setProfileDraft((current) => ({ ...current, goal }))}>
                  <span>{goal === "muscle_gain" ? "M" : goal === "fat_loss" ? "F" : goal === "strength" ? "S" : "G"}</span><strong>{fitnessGoalLabels[goal]}</strong><small>{goal === "muscle_gain" ? "Hypertrophy and progressive overload" : goal === "fat_loss" ? "Preserve muscle and support activity" : goal === "strength" ? "Improve performance on key lifts" : "Build a balanced, sustainable routine"}</small>
                </button>)}
              </div>
            </div>}

            {profileStep === 1 && <div className="profile-step">
              <div className="profile-step-heading"><span>02</span><div><h3>Set your training baseline</h3><p>AURA FIT uses this to choose volume and fit workouts into your week.</p></div></div>
              <label className="profile-field"><span>Experience level</span><div className="profile-segmented">{experienceLevels.map((experience) => <button key={experience} type="button" className={profileDraft.experience === experience ? "selected" : ""} onClick={() => setProfileDraft((current) => ({ ...current, experience }))}>{experienceLabels[experience]}</button>)}</div></label>
              <div className="profile-field-row">
                <label className="profile-field"><span>Training days per week</span><select value={profileDraft.daysPerWeek} onChange={(event) => setProfileDraft((current) => ({ ...current, daysPerWeek: Number(event.target.value) }))}>{[2, 3, 4, 5, 6].map((days) => <option key={days} value={days}>{days} days</option>)}</select></label>
                <label className="profile-field"><span>Minutes per session</span><select value={profileDraft.sessionMinutes} onChange={(event) => setProfileDraft((current) => ({ ...current, sessionMinutes: Number(event.target.value) }))}>{[30, 45, 60, 75, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label>
              </div>
            </div>}

            {profileStep === 2 && <div className="profile-step">
              <div className="profile-step-heading"><span>03</span><div><h3>Where and how do you train?</h3><p>Your coach will avoid exercises that do not fit your setup.</p></div></div>
              <div className="profile-choice-grid equipment-grid">{equipmentOptions.map((equipment) => <button key={equipment} type="button" className={profileDraft.equipment === equipment ? "selected" : ""} onClick={() => setProfileDraft((current) => ({ ...current, equipment }))}><span>{equipment === "full_gym" ? "GYM" : equipment === "home_dumbbells" ? "DB" : "BW"}</span><strong>{equipmentLabels[equipment]}</strong></button>)}</div>
              <label className="profile-field"><span>Preferred exercises <small>Optional</small></span><input maxLength={300} value={profileDraft.preferredExercises} onChange={(event) => setProfileDraft((current) => ({ ...current, preferredExercises: event.target.value }))} placeholder="e.g. bench press, pull-ups, Romanian deadlifts" /><em>Separate preferences with commas. They will be prioritised when compatible.</em></label>
            </div>}

            {profileStep === 3 && <div className="profile-step">
              <div className="profile-step-heading"><span>04</span><div><h3>Limitations and review</h3><p>Only save training restrictions you want AURA FIT to remember.</p></div></div>
              <label className="profile-field"><span>Injuries or limitations <small>Optional</small></span><textarea maxLength={500} rows={3} value={profileDraft.limitations} onChange={(event) => setProfileDraft((current) => ({ ...current, limitations: event.target.value }))} placeholder="Leave blank if none. Do not include sensitive medical details that are not needed for training." /><em>AURA FIT will pause personalised programming when a saved limitation needs professional clearance.</em></label>
              <div className="profile-review">
                <div><span>GOAL</span><strong>{fitnessGoalLabels[profileDraft.goal]}</strong></div>
                <div><span>BASELINE</span><strong>{experienceLabels[profileDraft.experience]} · {profileDraft.daysPerWeek} days</strong></div>
                <div><span>SESSION</span><strong>{profileDraft.sessionMinutes} min · {equipmentLabels[profileDraft.equipment]}</strong></div>
                <div><span>LIMITATIONS</span><strong>{profileDraft.limitations.trim() || "None reported"}</strong></div>
              </div>
              <p className="profile-safety-note"><span>!</span> Fitness guidance is educational and does not replace medical assessment or an in-person coach.</p>
            </div>}
            {profileError && <p className="profile-error" role="alert">{profileError}</p>}
          </div>

          <footer className="profile-modal-footer">
            <button type="button" className="profile-back" onClick={() => profileStep ? setProfileStep((step) => step - 1) : setProfileOpen(false)} disabled={profileSaving}>{profileStep ? "Back" : "Cancel"}</button>
            {profileStep < 3
              ? <button type="button" className="profile-next" onClick={() => setProfileStep((step) => step + 1)}>Continue <span>→</span></button>
              : <button type="button" className="profile-next" onClick={() => void saveProfile()} disabled={profileSaving}>{profileSaving ? "Saving…" : "Save profile"}</button>}
          </footer>
        </section>
      </div>}
    </main>
  );
}
