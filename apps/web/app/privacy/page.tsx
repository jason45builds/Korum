import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Korum",
  description: "Korum Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <main>
      <div className="page" style={{ paddingBottom: 48 }}>

        <Link href="/auth" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back
        </Link>

        <h1 className="t-h1" style={{ marginBottom: 4 }}>Privacy Policy</h1>
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
          Questions about your data? Contact us at{" "}
          <a href="mailto:privacy@korum.app" style={{ color: "var(--blue)" }}>privacy@korum.app</a>
        </p>

      </div>
    </main>
  );
}

const SECTIONS = [
  {
    title: "1. Information We Collect",
    body: `We collect information you provide directly to us when you create an account, including your name, phone number, email address, and location. We also collect information about your use of the Platform, such as matches created, teams joined, and payments made.\n\nWhen you use our marketplace, we may collect your device's approximate location (with your permission) to show you nearby grounds and vendors.`,
  },
  {
    title: "2. How We Use Your Information",
    body: `We use the information we collect to: (a) provide, maintain, and improve the Platform; (b) process payments and send payment confirmations; (c) send notifications about matches, squad status, and platform updates; (d) respond to your comments and questions; (e) detect and prevent fraud and abuse.`,
  },
  {
    title: "3. Information Sharing",
    body: `We do not sell your personal information to third parties. We share your information only in the following circumstances:\n\n• With other users as necessary to provide the service (e.g. your name and confirmation status are visible to your captain and team members).\n• With service providers who assist in our operations, including Razorpay for payment processing and Supabase for data storage.\n• When required by law or to protect the rights and safety of Korum, our users, or others.`,
  },
  {
    title: "4. Payment Data",
    body: `Payment transactions are processed by Razorpay. Korum does not store your full card details or UPI credentials. Please refer to Razorpay's privacy policy for information on how they handle payment data.`,
  },
  {
    title: "5. Data Retention",
    body: `We retain your account information for as long as your account is active or as needed to provide you services. If you delete your account, we will delete your personal information within 30 days, except where we are required to retain it for legal or regulatory reasons.`,
  },
  {
    title: "6. Your Rights",
    body: `Under applicable Indian law and DPDP Act 2023, you have the right to: (a) access the personal data we hold about you; (b) correct inaccurate personal data; (c) request deletion of your personal data; (d) withdraw consent for processing where consent is the legal basis.\n\nTo exercise these rights, contact us at privacy@korum.app.`,
  },
  {
    title: "7. Cookies and Analytics",
    body: `We use cookies and similar technologies to operate the Platform. We do not use third-party advertising trackers. We may use anonymised analytics to understand how the Platform is used and to improve it.`,
  },
  {
    title: "8. Security",
    body: `We implement appropriate technical and organisational measures to protect your personal information. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.`,
  },
  {
    title: "9. Children's Privacy",
    body: `Korum is not intended for use by individuals under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided us with their information, please contact us and we will delete it promptly.`,
  },
  {
    title: "10. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. Your continued use of the Platform after the effective date constitutes your acceptance of the updated Policy.`,
  },
];
