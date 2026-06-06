import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Korum",
  description: "Korum Terms of Service",
};

export default function TermsPage() {
  return (
    <main>
      <div className="page" style={{ paddingBottom: 48 }}>

        <Link href="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </Link>

        <h1 className="t-h1" style={{ marginBottom: 4 }}>Terms of Service</h1>
        <p className="t-caption" style={{ marginBottom: 32 }}>Last updated: June 2026</p>

        {SECTIONS.map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 28 }}>
            <h2 className="t-h3" style={{ marginBottom: 8 }}>{title}</h2>
            <div className="t-body" style={{ color: "var(--text-2)", lineHeight: 1.7 }}>
              {body.split("\n").map((line, i) => <p key={i} style={{ margin: "0 0 8px" }}>{line}</p>)}
            </div>
          </section>
        ))}

        <p className="t-caption" style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          Questions? Contact us at{" "}
          <a href="mailto:support@korum.app" style={{ color: "var(--blue)" }}>support@korum.app</a>
        </p>

      </div>
    </main>
  );
}

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using Korum ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.\n\nKorum is operated by Korum Technologies and is intended for users in India. By using the Platform, you confirm that you are at least 18 years of age.`,
  },
  {
    title: "2. Description of Service",
    body: `Korum is a match readiness platform that helps sports captains organise matches, collect player confirmations, and manage squad payments. The Platform facilitates payments between captains and players and provides tooling for team management, tournament organisation, and marketplace discovery.`,
  },
  {
    title: "3. User Accounts",
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate and complete information when creating an account and keep this information up to date.\n\nKorum reserves the right to suspend or terminate accounts that violate these Terms or that are used for fraudulent or abusive purposes.`,
  },
  {
    title: "4. Payments",
    body: `Korum facilitates payments between captains and players using Razorpay and UPI. Korum charges a platform fee of up to 2% on transactions processed through the Platform. All fees are disclosed prior to payment.\n\nKorum is not responsible for disputes between captains and players regarding match cancellations, refunds, or payment amounts. Captains are responsible for communicating refund policies to their players before collecting payment.`,
  },
  {
    title: "5. Prohibited Conduct",
    body: `You agree not to: (a) use the Platform for any unlawful purpose; (b) impersonate any person or entity; (c) collect or harvest user data without consent; (d) transmit spam or unsolicited communications; (e) attempt to gain unauthorised access to any part of the Platform; (f) use the Platform to facilitate gambling or betting activities.`,
  },
  {
    title: "6. Intellectual Property",
    body: `All content on the Platform, including but not limited to text, graphics, logos, and software, is the property of Korum Technologies and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.`,
  },
  {
    title: "7. Limitation of Liability",
    body: `To the maximum extent permitted by applicable law, Korum shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability shall not exceed the amount you paid to Korum in the 3 months preceding the claim.`,
  },
  {
    title: "8. Governing Law",
    body: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Chennai, Tamil Nadu.`,
  },
  {
    title: "9. Changes to Terms",
    body: `Korum reserves the right to modify these Terms at any time. We will notify users of material changes via email or in-app notification. Continued use of the Platform after changes constitutes acceptance of the updated Terms.`,
  },
];
