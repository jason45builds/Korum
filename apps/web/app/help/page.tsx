"use client";

import { useState } from "react";

const FAQS = [
  {
    category: "Getting Started",
    items: [
      { q: "How do I create a match?", a: "Tap the '+ Create Match' button from the dashboard or menu. Set the date, venue, squad size, and price per player. Share the generated link with your squad on WhatsApp — they can respond and pay without installing the app." },
      { q: "Do players need to download Korum?", a: "No! Players open the WhatsApp link, see the match details, tap I'm In, and pay — all in their browser without creating an account. If they want to track all their matches, they can sign up." },
      { q: "How do I join a match?", a: "Open the link your captain shared, or go to Join Match and enter the join code. You'll be asked to sign in (or up) to claim your spot." },
    ],
  },
  {
    category: "Payments",
    items: [
      { q: "How does payment work?", a: "Players pay via UPI or Razorpay after confirming their spot. The captain sets their UPI ID in the Share tab of the control panel. Players see the UPI ID and pay directly — the captain then confirms receipt. When Razorpay is configured, payments are automatic." },
      { q: "Can I pay with any UPI app?", a: "Yes. The payment screen shows the captain's UPI ID which you can copy or open in any UPI app (GPay, PhonePe, Paytm, etc.). There's also a direct 'Open UPI App' button." },
      { q: "What if I've paid but my spot isn't confirmed?", a: "Tap 'I Have Paid' on the payment screen. This notifies the captain who will verify and confirm you. If they don't confirm within an hour, message them directly." },
    ],
  },
  {
    category: "Captains",
    items: [
      { q: "How do I see who's paid?", a: "Open the match Control Panel → Players tab. You'll see everyone split by status: Confirmed, Needs Review (claimed paid), Not Paid Yet, and Maybe." },
      { q: "How do I lock the squad?", a: "In the Control Panel → Overview tab, tap 'Lock Squad'. This freezes the player list and opens the Strategy Room for all confirmed players." },
      { q: "Can I delete a match I created?", a: "Yes. In the Control Panel → Overview → Lifecycle section, tap 'Delete Match'. If players have already responded, the match will be Cancelled (to preserve payment records) rather than hard-deleted." },
      { q: "How do I check availability before booking a ground?", a: "Go to Teams → your team → Check Availability. This sends an availability check to all team members. They respond Available/Maybe/Unavailable and you can plan accordingly." },
    ],
  },
  {
    category: "Reliability Score",
    items: [
      { q: "What is the reliability score?", a: "A score from 0–100 that tracks how consistently you show up when you confirm for a match. Attending adds +2, a late cancel costs -8, and a no-show costs -15. It starts at 100." },
      { q: "How do captains see my score?", a: "Your score appears next to your name in the captain's player list. Captains use this to decide who to pick when slots are limited." },
      { q: "How do I improve my score?", a: "Simply show up when you say you will. If you can't make it, drop out as early as possible — early declines don't affect your score, only late cancels and no-shows do." },
    ],
  },
  {
    category: "Teams & Marketplace",
    items: [
      { q: "How do I create a team?", a: "Go to the Teams tab → tap '+ New'. Enter the team name, sport, and city. Share the generated invite code with your players so they can join." },
      { q: "How do I add players to my team?", a: "Share your team's invite code. Players go to Teams → Join → enter the code. Or send them the invite link directly." },
      { q: "What is the Marketplace?", a: "The Marketplace tab lets you find grounds to book and vendors (kit, equipment, food, photography, physio) near you. Grounds and vendors are sorted by distance from your location. Captains can also create Squad Shopping lists for team equipment, and players can vote on items and chip in money." },
      { q: "How do I list my ground or business?", a: "Go to Marketplace → tap 'Register your ground/business'. Fill in the details and submit. Your listing will be visible to teams in your city once reviewed." },
    ],
  },
  {
    category: "Account & Privacy",
    items: [
      { q: "How do I change my name or UPI details?", a: "Go to the Profile tab → Edit Profile. You can update your display name, city, sport, role, and UPI payment details from there." },
      { q: "Can I use Korum without signing up?", a: "Yes — you can view public matches and open captain links without an account. You need to sign up to confirm spots, pay, or access team features." },
      { q: "How do I sign out?", a: "Go to Profile tab → scroll down → Sign Out. Or go to Menu → Sign Out." },
    ],
  },
];

export default function HelpPage() {
  const [open, setOpen] = useState<string | null>(null);
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

  const whatsapp = () => window.open("https://wa.me/918141665555?text=Hi%2C+I+need+help+with+Korum", "_blank");

  return (
    <main>
      <div className="page">

        {/* Header */}
        <div>
          <h1 className="t-h2">Help & FAQs</h1>
          <p className="t-caption" style={{ marginTop: 4, color: "var(--text-3)" }}>
            Everything you need to know about Korum
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions…"
            style={{ width: "100%", padding: "12px 12px 12px 42px", border: "1.5px solid var(--line)", borderRadius: "var(--r-lg)", fontSize: 14, background: "var(--surface)", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        {/* FAQ sections */}
        {filtered.map(cat => (
          <div key={cat.category}>
            <p className="section-label" style={{ marginBottom: 8 }}>{cat.category}</p>
            <div className="card" style={{ overflow: "hidden" }}>
              {cat.items.map((item, i) => (
                <div key={item.q} style={{ borderBottom: i < cat.items.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <button
                    onClick={() => setOpen(open === item.q ? null : item.q)}
                    style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, textAlign: "left" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, lineHeight: 1.4, flex: 1 }}>{item.q}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="2.5" strokeLinecap="round"
                      style={{ flexShrink: 0, marginTop: 2, transition: "transform 200ms", transform: open === item.q ? "rotate(180deg)" : "none" }}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  {open === item.q && (
                    <div style={{ padding: "0 16px 14px", fontSize: 14, color: "var(--text-3)", lineHeight: 1.65 }}>
                      {item.a}
                    </div>
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

        {/* Contact */}
        <div className="card card-pad" style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-border)" }}>
          <p style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--blue)" }}>
            Still need help?
          </p>
          <p className="t-caption" style={{ marginBottom: 14 }}>Our team responds on WhatsApp within a few hours.</p>
          <button onClick={whatsapp}
            style={{ padding: "12px 20px", border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Chat on WhatsApp
          </button>
        </div>

      </div>
    </main>
  );
}
