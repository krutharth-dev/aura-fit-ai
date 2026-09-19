"use client";

import { useEffect, useState } from "react";
import styles from "./account.module.css";

type StorageSummary = {
  provider: string;
  synced: boolean;
  conversations: number;
  messages: number;
  workouts: number;
  profileSaved: boolean;
  latestActivityAt: number | null;
};

function activityLabel(timestamp: number | null) {
  if (!timestamp) return "No saved activity yet";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function AccountStorageClient() {
  const [storage, setStorage] = useState<StorageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStorage() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/account/storage", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await response.json() as { storage?: StorageSummary; error?: string };
      if (!response.ok || !data.storage) throw new Error(data.error || "Could not load account storage");
      setStorage(data.storage);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load account storage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadStorage(); }, []);

  return (
    <section className={styles.storagePanel} aria-labelledby="storage-title">
      <div className={styles.storageHeading}>
        <div>
          <p className={styles.eyebrow}>CLOUD STORAGE</p>
          <h2 id="storage-title">What AURA FIT has saved</h2>
          <p>{loading ? "Reading your private account workspace…" : storage ? `${storage.provider} · account sync active` : "Storage status unavailable"}</p>
        </div>
        <div className={styles.storageActions}>
          <button type="button" onClick={() => void loadStorage()} disabled={loading}>Refresh</button>
          <a href="/api/account/export">Export my data</a>
        </div>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      <div className={styles.metrics} aria-busy={loading}>
        <article>
          <span>SAVED CHATS</span>
          <strong>{loading ? "—" : storage?.conversations ?? 0}</strong>
          <small>{loading ? "Checking messages…" : `${storage?.messages ?? 0} total messages`}</small>
        </article>
        <article>
          <span>WORKOUTS</span>
          <strong>{loading ? "—" : storage?.workouts ?? 0}</strong>
          <small>Private training journal entries</small>
        </article>
        <article>
          <span>FITNESS PROFILE</span>
          <strong className={styles.wordMetric}>{loading ? "—" : storage?.profileSaved ? "Saved" : "Not set"}</strong>
          <small>Goal, schedule and equipment</small>
        </article>
        <article>
          <span>LAST SYNCED ACTIVITY</span>
          <strong className={styles.activityMetric}>{loading ? "Checking…" : activityLabel(storage?.latestActivityAt ?? null)}</strong>
          <small>{storage?.synced === false ? "Sync unavailable" : "Available on signed-in devices"}</small>
        </article>
      </div>

      <div className={styles.exportNote}>
        <span>↓</span>
        <div>
          <strong>Portable account backup</strong>
          <p>Export downloads your saved profile, conversations and workout journal as JSON. Authentication secrets are excluded.</p>
        </div>
      </div>
    </section>
  );
}
