"use client";

import { useState } from "react";

import { AuthPanel } from "@/components/shared/AuthPanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { fetchAvailability, updateAvailability } from "@/services/api/availability";

const createEntry = () => ({
  slotLabel: "Preferred slot",
  slotStartsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  slotEndsAt: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString().slice(0, 16),
  isAvailable: true,
});

export default function CreatePollPage() {
  const { isAuthenticated, loading } = useAuth();
  const [matchId, setMatchId] = useState("");
  const [entries, setEntries] = useState([createEntry()]);
  const [message, setMessage] = useState<string | null>(null);
  const [currentRows, setCurrentRows] = useState<Array<Record<string, unknown>>>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !isAuthenticated) {
    return (
      <main>
        <AuthPanel
          title="Sign in for availability"
          description="Availability is tied to your authenticated Korum profile."
        />
      </main>
    );
  }

  const savePoll = async () => {
    setSubmitting(true);
    setMessage(null);

    try {
      await updateAvailability({
        matchId,
        entries: entries.map((entry) => ({
          ...entry,
          slotStartsAt: new Date(entry.slotStartsAt).toISOString(),
          slotEndsAt: new Date(entry.slotEndsAt).toISOString(),
        })),
      });
      setMessage("Availability saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save availability.");
    } finally {
      setSubmitting(false);
    }
  };

  const loadCurrent = async () => {
    try {
      const response = await fetchAvailability(matchId);
      setCurrentRows(response.availability as unknown as Array<Record<string, unknown>>);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load availability.");
    }
  };

  return (
    <main>
      <div className="page-shell">
        <section className="hero-panel">
          <p className="eyebrow">Availability Poll</p>
          <h1 className="title-lg">Capture simple yes or no readiness windows.</h1>
          <p className="muted">
            No heavy calendar UI here. Just useful slots that captains can review quickly.
          </p>
        </section>

        <div className="grid grid-2">
          <Card title="Update availability">
            <div className="form-grid">
              <label className="label">
                Match ID
                <input
                  className="input"
                  value={matchId}
                  onChange={(event) => setMatchId(event.target.value)}
                />
              </label>
              {entries.map((entry, index) => (
                <div key={`${entry.slotLabel}-${index}`} className="panel" style={{ padding: "1rem" }}>
                  <div className="form-grid">
                    <label className="label">
                      Slot label
                      <input
                        className="input"
                        value={entry.slotLabel}
                        onChange={(event) =>
                          setEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, slotLabel: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="label">
                      Start
                      <input
                        type="datetime-local"
                        className="input"
                        value={entry.slotStartsAt}
                        onChange={(event) =>
                          setEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, slotStartsAt: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="label">
                      End
                      <input
                        type="datetime-local"
                        className="input"
                        value={entry.slotEndsAt}
                        onChange={(event) =>
                          setEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, slotEndsAt: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="row">
                      <input
                        type="checkbox"
                        checked={entry.isAvailable}
                        onChange={(event) =>
                          setEntries((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, isAvailable: event.target.checked }
                                : item,
                            ),
                          )
                        }
                      />
                      Available
                    </label>
                  </div>
                </div>
              ))}
              <div className="cluster">
                <Button
                  variant="ghost"
                  onClick={() => setEntries((current) => [...current, createEntry()])}
                >
                  Add Slot
                </Button>
                <Button variant="secondary" onClick={() => void loadCurrent()}>
                  Load Existing
                </Button>
              </div>
              <Button onClick={() => void savePoll()} loading={submitting} block>
                Save Availability
              </Button>
              {message ? (
                <p className="muted" style={{ margin: 0 }}>
                  {message}
                </p>
              ) : null}
            </div>
          </Card>

          <Card title="Current availability">
            {currentRows.length === 0 ? (
              <p className="muted">Load a match to see saved slots.</p>
            ) : (
              <div className="list">
                {currentRows.map((row) => (
                  <div key={String(row.id)} className="metric">
                    <strong>{String(row.slot_label)}</strong>
                    <div className="muted" style={{ fontSize: "0.9rem" }}>
                      {String(row.slot_starts_at)} to {String(row.slot_ends_at)}
                    </div>
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
