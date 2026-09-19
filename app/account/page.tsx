import Link from "next/link";
import { requireAuraFitUser, signOutPath } from "../auth";
import AccountStorageClient from "./account-storage-client";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Account & storage | AURA FIT",
  robots: { index: false, follow: false },
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0]?.slice(0, 2) || "AF").toUpperCase();
}

export default async function AccountPage() {
  const user = await requireAuraFitUser("/account");

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">AURA<span>FIT</span></Link>
        <nav aria-label="Workspace">
          <Link href="/">AI coach</Link>
          <Link href="/training">Training journal</Link>
          <Link href="/account" aria-current="page">Account</Link>
        </nav>
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.avatar}>{initials(user.displayName)}</div>
          <div>
            <p className={styles.eyebrow}>ACCOUNT & STORAGE</p>
            <h1>{user.displayName}</h1>
            <p>{user.email}</p>
          </div>
          <a className={styles.signout} href={signOutPath("/")}>Sign out</a>
        </section>

        <AccountStorageClient />

        <section className={styles.infoGrid}>
          <article>
            <span>PRIVATE BY ACCOUNT</span>
            <h2>Your data follows your login.</h2>
            <p>Saved conversations, your training profile and workout journal are scoped to this signed-in account and sync across devices.</p>
          </article>
          <article>
            <span>SECURE SESSION</span>
            <h2>No plaintext passwords.</h2>
            <p>Your export contains your AURA FIT content only. Password hashes and session tokens are never included in account-data exports.</p>
          </article>
        </section>

        <footer className={styles.footer}>
          <span>AURA FIT · Account-owned cloud storage</span>
          <div><Link href="/privacy">Privacy</Link><a href="https://github.com/krutharth-dev/aura-fit-ai" target="_blank" rel="noreferrer">Source code ↗</a></div>
        </footer>
      </div>
    </main>
  );
}
