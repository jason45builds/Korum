"use client";

import { useState } from "react";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { fetchAvailability, updateAvailability } from "@/services/api/availability";
import type { MatchAvailability } from "@korum/types/match";

const createEntry = () => ({
  slotLabel: "Preferred slot",
  slotStartsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  slotEndsAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString().slice(0, 16),
  isAvailable: true,
});

export default function CreatePollPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [matchId, setMatchId] = useState("");
  const [entries, setEntries] = useState([createEntry()]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [currentRows, setCurrentRows] = useState<MatchAvailability[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);

  if (authLoading) return <main><Loader label="Loading…" /></main>;

  if (!isAuthenticated) {
    return (
      <main>
        <div className="page-shell">
          <AuthPanel
            title="Sign in for availability"
            description="Availability is tied to your authenticated Korum profile."
          />
        </div>
      </main>
    );
  }

  const savePoll = async () => {
    if (!matchId.trim()) {
      setMessage({ text: "Enter a Match ID first.", error: true });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await updateAvailability({
        matchId: matchId.trim(),
        entries: entries.map((entry) => ({
          ...entry,
          slotStartsAt: new Date(entry.slotStartsAt).toISOString(),
          slotEndsAt:   new Date(entry.slotEndsAt).toISOString(),
        })),
      });
      setMessage({ text: "Availability saved successfully!", error: false });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not save availability.", error: true });
    } finally {
      setSubmitting(false);
    }
  };

  const loadCurrent = async () => {
    if (!matchId.trim()) {
      setMessage({ text: "Enter a Match ID to load availability.", error: true });
      return;
    }
    setFetching(true);
    setMessage(null);
    try {
      const response = await fetchAvailability(matchId.trim());
      setCurrentRows(response.availability);
      if (response.availability.length === 0) {
        setMessage({ text: "No availability saved for this match yet.", error: false });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Could not load availability.", error: true });
    } finally {
      setFetching(false);
    }
  };

  const updateEntry = (index: number, field: string, value: string | boolean) => {
    setEntries((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel animate-in">
          <p className="eyebrow">Availability Poll</p>
          <h1 className="title-lg" style={{ marginTop: "0.4rem" }}>
            Mark your readiness windows.
          </h1>
          <p className="muted" style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
            Simple yes/no slots that captains can review at a glance.
          </p>
        </section>

        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <Card eyebrow="Your Slots" title="Update availability">
            <div className="form-grid">
              <label className="label">
                Match ID
                <input
                  className="input"
                  placeholder="Paste your Match ID from the Dashboard"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                />
              </label>

              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="panel"
                  style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}
                >
                  <div className="row-between">
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", fontFamily: "var(--font-display)" }}>
                      Slot {index + 1}
                    </span>
                    {entries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEntries((c) => c.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="form-grid">
                    <label className="label">
                      Label
                      <input
                        className="input"
                        value={entry.slotLabel}
                        onChange={(e) => updateEntry(index, "slotLabel", e.target.value)}
                      />
                    </label>
                    <label className="label">
                      Start
                      <input
                        type="datetime-local"
                        className="input"
                        value={entry.slotStartsAt}
                        onChange={(e) => updateEntry(index, "slotStartsAt", e.target.value)}
                      />
                    </label>
                    <label className="label">
                      End
                      <input
                        type="datetime-local"
                        className="input"
                        value={entry.slotEndsAt}
                        onChange={(e) => updateEntry(index, "slotEndsAt", e.target.value)}
                      />
                    </label>
                    <label className="row" style={{ cursor: "pointer", gap: "0.6rem" }}>
                      <input
                        type="checkbox"
                        checked={entry.isAvailable}
                        style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer" }}
                        onChange={(e) => updateEntry(index, "isAvailable", e.target.checked)}
                      />
                      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {entry.isAvailable ? "Available ✓" : "Not available"}
                      </span>
                    </label>
                  </div>
                </div>
              ))}

              <div className="cluster">
                <Button variant="ghost" size="sm" onClick={() => setEntries((c) => [...c, createEntry()])}>
                  + Add Slot
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void loadCurrent()} loading={fetching}>
                  Load Existing
                </Button>
              </div>

              <Button onClick={() => void savePoll()} loading={submitting} block>
                Save Availability
              </Button>

              {message && (
                <p
                  className={`message-strip${message.error ? " error" : " success"}`}
                  role={message.error ? "alert" : "status"}
                >
                  {message.text}
                </p>
              )}
            </div>
          </Card>

          <Card eyebrow="Saved Slots" title="Current availability">
            {currentRows.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Enter a Match ID and click "Load Existing" to see saved slots.
                </p>
              </div>
            ) : (
              <div className="list">
                {currentRows.map((row) => (
                  <div key={row.id} className="list-row">
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>{row.slotLabel}</strong>
                      <div className="faint" style={{ fontSize: "0.8rem", marginTop: "0.15rem" }}>
                        {new Date(row.slotStartsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {" → "}
                        {new Date(row.slotEndsAt).toLocaleString("en-IN", { timeStyle: "short" })}
                      </div>
                    </div>
                    <span className={`badge ${row.isAvailable ? "badge-success" : "badge-danger"}`}>
                      {row.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
