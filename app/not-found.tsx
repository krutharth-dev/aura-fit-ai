import Link from "next/link";

export default function NotFound() {
  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#090a0e", color: "#f4f5f7" }}>
    <section style={{ maxWidth: 560, textAlign: "center" }}>
      <p style={{ color: "#8cff54", fontWeight: 800, letterSpacing: ".14em" }}>AURA FIT · 404</p>
      <h1 style={{ fontSize: 42, margin: "10px 0" }}>That page isn’t part of this workout.</h1>
      <p style={{ color: "#8b909d", lineHeight: 1.6 }}>The link may be outdated or the page may have moved. Your account and saved training data are unaffected.</p>
      <Link href="/" style={{ display: "inline-block", marginTop: 18, color: "#0a0c0b", background: "#8cff54", padding: "12px 18px", borderRadius: 8, fontWeight: 800, textDecoration: "none" }}>Return to AURA FIT</Link>
    </section>
  </main>;
}
