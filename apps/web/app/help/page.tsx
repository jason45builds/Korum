"use client";

import { useState } from "react";

// Issue #22: support WhatsApp number moved to env var / constant — not hardcoded in JSX
// Issue #39: FAQ answers updated to reflect actual sign-in requirement for players

const SUPPORT_WA = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "918141665555";

const FAQS = [
  {
    category: "Getting Started",
    items: [
      { q: "How do I create a match?", a: "Tap '+ Create Match' from the dashboard or menu. Set the date, venue, squad size, and price per player. After creating, you get a shareable link to send on WhatsApp — players tap it, sign in (takes 10 seconds), and confirm their spot." },
      // Issue #39: updated to reflect sign-in is required; removed "no account needed"
      { q: "Do players need to sign up?", a: "Players need to sign in to claim a spot and pay — it takes about 10 seconds with a phone number or email. There's no app to download; everything works in the browser. Players can view match details without signing in, but confirming and paying requires an account." },
      { q: "How do I join a match?", a: "Open the link your captain shared. Tap 'I'm In', sign in if you haven't already, and pay your match fee. Your spot is confirmed once payment goes through." },
    ],
  },
  {
    category: "Payments",
    items: [
      { q: "How does payment work?", a: "After tapping 'I'm In', you'll see the payment screen. Pay via UPI (GPay, PhonePe, Paytm, etc.) or Razorpay. Your spot is confirmed automatically once payment is verified." },
      { q: "Can I pay with any UPI app?", a: "Yes. The payment screen shows the captain's UPI ID — copy it and pay from any UPI app, or use the 'Open UPI App' button for a direct link." },
      { q: "What if I've paid but my spot isn't confirmed?", a: "Tap 'I Have Paid' on the payment screen. This notifies the captain who will verify and confirm you. If they don't respond within an hour, message them directly." },
    ],
  },
  {
    category: "Captains",
    items: [
      { q: "How do I see who's paid?", a: "Open the match Control Panel → Players tab. Players are sorted by status: Confirmed, Pending payment, and Invited." },
      { q: "How do I lock the squad?", a: "In the Control Panel → Overview, tap 'Lock Squad'. You need at least 2 confirmed & paid players. Locking freezes the player list and opens the Strategy Room for confirmed players." },
      { q: "Can I delete a match I created?", a: "Yes. In the Control Panel → Lifecycle section, tap 'Delete Match'. If players have already responded, the match is Cancelled (to preserve records) rather than permanently deleted." },
      { q: "How do I check availability before a match?", a: "Go to Teams → your team → Check Availability. Players respond Available / Maybe / Unavailable, and you see a calendar heatmap of who's free on each day." },
    ],
  },
  {
    category: "Reliability Score",
    items: [
      { q: "What is the reliability score?", a: "A score from 0–100 that tracks how consistently you show up. Attending: +2. Late cancel: -8. No-show: -15. Everyone starts at 100." },
      { q: "How do captains see my score?", a: "Your score appears next to your name in the captain's player list. Captains use it to prioritise who gets a spot when squads are full." },
      { q: "How do I improve my score?", a: "Show up when you say you will. If you can't make it, drop out as early as possible — early declines don't affect your score. Late cancels and no-shows do." },
    ],
  },
  {
    category: "Teams & Marketplace",
    items: [
      { q: "How do I create a team?", a: "Teams tab → '+ New'. Enter the name, sport, and city. Share the invite code or link with players." },
      { q: "How do I add players to my team?", a: "Share the invite link or code. Players go to Teams → Join → enter the code. Or send the link directly — they tap Join and they're in." },
      { q: "What is the Marketplace?", a: "Find grounds to book and vendors (kit, equipment, food, photography, physio) near you. Results are sorted by distance from your location. Captains can also create Squad Shopping lists and players can vote on items and chip in." },
      { q: "How do I list my ground or business?", a: "Marketplace → 'Register your ground / business'. Fill in the details — your listing is visible to teams in your city once reviewed." },
    ],
  },
  {
    category: "Account & Privacy",
    items: [
      { q: "How do I change my name or UPI details?", a: "Profile tab → Edit Profile. Update your display name, city, sport, role, and UPI payment details from there." },
      { q: "How do I sign out?", a: "Profile tab → scroll down → Sign Out. Or Menu → Sign Out." },
    ],
  },
];

export default function HelpPage() {
  const [open, setOpen]     = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = search.trim().length > 1
    ? FAQS.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.q.toLowerCase().includes(search.toLowerCase()) ||
          item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQS;

  // Issue #22: support number from constant, not hardcoded in JSX
  const openSupport = () =>
    window.open(`https://wa.me/${SUPPORT_WA}?text=Hi%2C+I+need+help+with+Korum`, "_blank");

  return (
    <main>
      <div className="page">

        <div>
          <h1 className="t-h2">Help & FAQs</h1>
          <p className="t-caption" style={{ marginTop: 4, color: "var(--text-3)" }}>Everything you need to know about Korum</p>
        </div>

        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions…"
            style={{ width: "100%", padding: "12px 12px 12px 42px", border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", fontSize: 14, background: "var(--surface)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>

        {filtered.map(cat => (
          <div key={cat.category}>
            <p className="section-label" style={{ marginBottom: 8 }}>{cat.category}</p>
            <div className="card" style={{ overflow: "hidden" }}>
              {cat.items.map((item, i) => (
                <div key={item.q} style={{ borderBottom: i < cat.items.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <button onClick={() => setOpen(open === item.q ? null : item.q)}
                    style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, textAlign: "left" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.4, flex: 1 }}>{item.q}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"
                      style={{ flexShrink: 0, marginTop: 2, transition: "transform 200ms", transform: open === item.q ? "rotate(180deg)" : "none" }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {open === item.q && (
                    <div style={{ padding: "0 16px 14px", fontSize: 14, color: "var(--text-3)", lineHeight: 1.65 }}>{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card card-pad" style={{ textAlign: "center", padding: "32px 20px" }}>
            <p className="t-title" style={{ marginBottom: 6 }}>No results for &ldquo;{search}&rdquo;</p>
            <p className="t-caption">Try a different search term or contact us below.</p>
          </div>
        )}

        <div className="card card-pad" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-border)" }}>
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--blue)" }}>Still need help?</p>
          <p className="t-caption" style={{ marginBottom: 14 }}>Our team responds on WhatsApp within a few hours.</p>
          <button onClick={openSupport}
            style={{ padding: "12px 20px", border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat on WhatsApp
          </button>
        </div>

      </div>
    </main>
  );
}
