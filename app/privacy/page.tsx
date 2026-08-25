import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · AURA FIT AI",
  description: "How AURA FIT AI protects account-owned chat history and fitness profile data.",
};

export default function PrivacyPage() {
  return <main className="policy-shell">
    <header className="policy-header"><Link href="/">AURA FIT</Link><span>PRIVACY</span></header>
    <article className="policy-card">
      <p className="policy-kicker">EFFECTIVE 25 AUGUST 2026</p>
      <h1>Privacy Policy</h1>
      <p className="policy-lead">AURA FIT is designed so saved conversations belong to one authenticated account. Guests may use the coach, but guest conversations are temporary and are not stored as durable history.</p>

      <h2>1. Information we process</h2>
      <p>When you create an account, AURA FIT stores the email address and display name you provide. Your password is never stored in plaintext: a random salt and a PBKDF2-SHA256 password hash are stored instead. Conversation ownership uses a separate one-way SHA-256 key derived from the normalised email address.</p>
      <p>For signed-in users, we store chat titles, messages, coach responses, timestamps and the fitness profile fields you choose to save. Session records contain a hash of the random session token, its account relationship and expiry time. The raw session token exists only in an HttpOnly browser cookie.</p>

      <h2>2. Account isolation</h2>
      <p>Every saved-conversation read, write, rename and deletion is authorised on the server using the signed-in account ownership key. A different account cannot retrieve a conversation by guessing or supplying its identifier. Signing out invalidates the active server session and expires the browser cookie.</p>

      <h2>3. Analytics and error monitoring</h2>
      <p>We retain privacy-minimised operational events for up to 30 days. These events contain event type, coach route, account-or-guest status, response status, timing and sanitised error codes. They do not contain chat text, email addresses, account identifiers, IP addresses, exercise selections or medical/fitness details.</p>

      <h2>4. AI processing and service providers</h2>
      <p>The safe built-in coach can answer without an external model. When Groq mode is enabled, the current prompt, recent conversation context and relevant saved fitness preferences may be sent to Groq to generate the requested answer. The public application runs on Cloudflare Workers and uses Cloudflare D1 for account and application storage.</p>

      <h2>5. Retention and deletion</h2>
      <p>Signed-in chat history and fitness profiles remain until the user deletes them or the service is retired. Deleting a conversation permanently removes its messages from the application database. Account sessions expire automatically; operational analytics and error events are limited to a 30-day retention window.</p>

      <h2>6. Safety and sensitive information</h2>
      <p>AURA FIT provides educational fitness guidance and is not a medical service. Do not enter information you do not want stored in your account history. Avoid unnecessary health identifiers or detailed medical records.</p>

      <h2>7. Your choices</h2>
      <p>You may use the coach without signing in, in which case no durable conversation history is created. Signed-in users can review and delete individual conversations from the sidebar and can remove their saved training profile.</p>

      <h2>8. Account limitations</h2>
      <p>This open-source demonstration uses email-and-password accounts but does not currently provide email verification, password reset or social sign-in. Do not reuse a sensitive password from another service.</p>

      <h2>9. Updates and contact</h2>
      <p>Material policy changes will update the effective date on this page. Privacy or security concerns should be reported privately to the repository owner in accordance with the project’s security policy; do not include passwords, API keys or sensitive medical details in a report.</p>

      <div className="policy-actions"><Link href="/">Return to AURA FIT</Link><a href="https://github.com/krutharth-dev/aura-fit-ai/blob/main/SECURITY.md">Security policy</a></div>
    </article>
  </main>;
}
