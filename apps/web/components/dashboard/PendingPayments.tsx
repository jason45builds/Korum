import Link from "next/link";

import { formatCurrencyINR } from "@korum/utils/format";
import { EmptyState } from "@/components/shared/EmptyState";

function paymentStatusClass(status: string) {
  const s = status.toUpperCase();
  if (s === "PAID") return "badge-success";
  if (s === "PENDING" || s === "AWAITING_PAYMENT") return "badge-warning";
  if (s === "FAILED" || s === "REFUNDED") return "badge-danger";
  return "";
}

export function PendingPayments({
  payments,
}: {
  payments: Array<{
    id: string;
    matchId: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}) {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon="✅"
        title="All payments settled"
        description="Paid players and settled refunds drop off this list automatically."
      />
    );
  }

  return (
    <section className="panel animate-in" style={{ display: "grid", gap: "1rem" }}>
      <div className="row-between">
        <div>
          <p className="eyebrow">Payments</p>
          <h3 className="title-md">Pending Payments</h3>
        </div>
        <span className="badge badge-warning">{payments.length} pending</span>
      </div>

      <div className="list">
        {payments.map((payment) => (
          <div key={payment.id} className="list-row">
            <div>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>
                {formatCurrencyINR(payment.amount)}
              </strong>
              <div className="faint" style={{ marginTop: "0.15rem" }}>
                {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "short",
                })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className={`badge ${paymentStatusClass(payment.status)}`}>
                {payment.status.replaceAll("_", " ")}
              </span>
              <Link
                href={`/match/payment?matchId=${payment.matchId}`}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--primary)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Pay →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
