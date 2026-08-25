import Link from "next/link";
import styles from "./auth-form.module.css";

type AuthFormProps = {
  mode: "signin" | "signup";
  returnTo: string;
  error?: string;
};

const errorMessages: Record<string, string> = {
  invalid_email: "Enter a valid email address.",
  invalid_name: "Enter a name with at least two characters.",
  weak_password: "Use a password between 8 and 128 characters.",
  email_taken: "An account already exists for that email. Sign in instead.",
  invalid_credentials: "The email or password is incorrect.",
  service_unavailable: "Account storage is temporarily unavailable. Please try again.",
  invalid_request: "That request could not be accepted. Please try again.",
};

export default function AuthForm({ mode, returnTo, error }: AuthFormProps) {
  const signUp = mode === "signup";
  return <main className={styles.shell}>
    <div className={styles.glow} />
    <section className={styles.card}>
      <Link href="/" className={styles.brand}>AURA FIT</Link>
      <p className={styles.kicker}>{signUp ? "CREATE ACCOUNT" : "WELCOME BACK"}</p>
      <h1>{signUp ? "Save your training workspace" : "Sign in to your workspace"}</h1>
      <p className={styles.lead}>{signUp
        ? "Create an account to keep your fitness profile and conversations available across devices."
        : "Continue your saved conversations and use your training profile on this device."}</p>
      {error && <div className={styles.error} role="alert">{errorMessages[error] ?? errorMessages.invalid_request}</div>}
      <form action={signUp ? "/api/auth/signup" : "/api/auth/signin"} method="post" className={styles.form}>
        <input type="hidden" name="return_to" value={returnTo} />
        {signUp && <label>
          <span>Name</span>
          <input name="display_name" type="text" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your name" />
        </label>}
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" autoComplete={signUp ? "new-password" : "current-password"} required minLength={8} maxLength={128} placeholder="At least 8 characters" />
        </label>
        <button type="submit">{signUp ? "Create account" : "Sign in"}</button>
      </form>
      <p className={styles.switch}>{signUp ? "Already have an account?" : "New to AURA FIT?"} {signUp
        ? <Link href={`/signin?return_to=${encodeURIComponent(returnTo)}`}>Sign in</Link>
        : <Link href={`/signup?return_to=${encodeURIComponent(returnTo)}`}>Create one</Link>}</p>
      <p className={styles.privacy}>Passwords are salted and hashed before storage. Session cookies are HttpOnly and are not accessible to browser JavaScript. <Link href="/privacy">Privacy policy</Link></p>
    </section>
  </main>;
}
