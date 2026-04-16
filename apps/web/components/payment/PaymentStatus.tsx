function statusInfo(paymentStatus?: string, participantStatus?: string) {
  const ps = paymentStatus?.toUpperCase() ?? "";
  if (ps === "PAID") return { label: "Paid", cls: "badge-success", icon: "✅", message: "Your payment is confirmed." };
  if (ps === "PENDING") return { label: "Payment pending", cls: "badge-warning", icon: "⏳", message: "Complete payment to lock your spot." };
  if (ps === "REFUNDED") return { label: "Refunded", cls: "badge-primary", icon: "↩️", message: "Your payment has been refunded." };
  if (ps === "FAILED") return { label: "Payment failed", cls: "badge-danger", icon: "❌", message: "Payment did not go through. Try again." };
  return { label: "Not started", cls: "", icon: "💳", message: "You haven't paid yet for this match." };
}

export function PaymentStatus({
  paymentStatus,
  participantStatus,
}: {
  paymentStatus?: string;
  participantStatus?: string;
}) {
  const info = statusInfo(paymentStatus, participantStatus);

  return (
    <section className="panel animate-in" style={{ display: "grid", gap: "0.85rem" }}>
      <div>
        <p className="eyebrow">Your Status</p>
        <div className="row" style={{ marginTop: "0.4rem", gap: "0.6rem" }}>
          <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>{info.icon}</span>
          <span className={`badge ${info.cls}`}>{info.label}</span>
        </div>
      </div>

      <p className="muted" style={{ fontSize: "0.88rem" }}>{info.message}</p>

      {participantStatus && (
        <div className="row-between" style={{ paddingTop: "0.75rem", borderTop: "1px solid var(--line)" }}>
          <span className="faint">Participant slot</span>
          <span className="badge">{participantStatus.replaceAll("_", " ")}</span>
        </div>
      )}
    </section>
  );
}
