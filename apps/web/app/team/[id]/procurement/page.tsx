"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/shared/Loader";

type ProcItem = {
  id: string; name: string; description: string | null;
  estimated_cost: number | null; target_amount: number | null;
  collected_amount: number; vendor_id: string | null;
  votesNeeded: number; votesNotNeeded: number;
  myVote: "NEEDED" | "NOT_NEEDED" | null;
  totalContributed: number; myContribution: number;
};
type ProcList = {
  id: string; title: string; status: string;
  created_at: string; items: ProcItem[];
};

export default function ProcurementPage() {
  const { id: teamId } = useParams<{ id: string }>();
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  const [lists, setLists]         = useState<ProcList[]>([]);
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [showNewList, setShowNewList]   = useState(false);
  const [addingItem, setAddingItem]     = useState<string | null>(null); // listId
  const [newItem, setNewItem]           = useState({ name: "", estimatedCost: "", targetAmount: "" });
  const [contributing, setContributing] = useState<string | null>(null); // itemId
  const [contribAmount, setContribAmount] = useState("");
  const [voting, setVoting]             = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/procurement?teamId=${teamId}`, { credentials: "same-origin" });
      const d = await res.json() as { lists: ProcList[] };
      setLists(d.lists ?? []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated]);

  const post = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/procurement", {
      method: "POST", headers: { "Content-Type": "application/json" },
      credentials: "same-origin", body: JSON.stringify(body),
    });
    if (!res.ok) { const d = await res.json() as { error?: string }; throw new Error(d.error); }
    return res.json();
  };

  const createList = async () => {
    if (!newListTitle.trim()) return;
    setCreating(true);
    try { await post({ action: "create_list", teamId, title: newListTitle.trim() }); await load(); setNewListTitle(""); setShowNewList(false); }
    finally { setCreating(false); }
  };

  const addItem = async (listId: string) => {
    if (!newItem.name.trim()) return;
    try {
      await post({ action: "add_item", listId, name: newItem.name, estimatedCost: newItem.estimatedCost ? Number(newItem.estimatedCost) : null, targetAmount: newItem.targetAmount ? Number(newItem.targetAmount) : null });
      await load(); setAddingItem(null); setNewItem({ name: "", estimatedCost: "", targetAmount: "" });
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  };

  const vote = async (itemId: string, v: "NEEDED" | "NOT_NEEDED") => {
    setVoting(itemId);
    try { await post({ action: "vote", itemId, vote: v }); await load(); }
    finally { setVoting(null); }
  };

  const contribute = async (itemId: string) => {
    const amount = Number(contribAmount);
    if (!amount || amount <= 0) return;
    try { await post({ action: "contribute", itemId, amount }); await load(); setContributing(null); setContribAmount(""); }
    catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
  };

  if (authLoading || loading) return <main><Loader label="Loading procurement…" /></main>;

  return (
    <main>
      <div className="page">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="t-caption" style={{ color: "var(--blue)" }}>Team</p>
            <h1 className="t-h2">Squad Shopping</h1>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => setShowNewList(v => !v)}>
            + New List
          </button>
        </div>

        <p className="t-body" style={{ color: "var(--text-3)" }}>
          Captain adds items, players vote if it&apos;s needed, and everyone can chip in toward the cost.
        </p>

        {/* New list form */}
        {showNewList && (
          <div className="card card-pad animate-pop">
            <p style={{ margin: "0 0 12px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>New procurement list</p>
            <div className="form-stack">
              <div className="field">
                <label className="field-label">List title</label>
                <input className="input" placeholder="Match day kit · Season equipment…" value={newListTitle} onChange={e => setNewListTitle(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="btn btn--primary btn--block" disabled={creating} onClick={() => void createList()}>
                  {creating ? "Creating…" : "Create"}
                </button>
                <button className="btn btn--ghost btn--block" onClick={() => setShowNewList(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Find vendors */}
        <Link href="/marketplace?tab=vendors">
          <div className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, background: "var(--blue-soft)", border: "1px solid var(--blue-border)", cursor: "pointer" }}>
            <span style={{ fontSize: 22 }}>🛍️</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--blue)" }}>Browse vendors nearby</p>
              <p className="t-caption" style={{ marginTop: 2 }}>Kit, equipment, food & more — sorted by distance</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
          </div>
        </Link>

        {/* Empty state */}
        {lists.length === 0 && !showNewList && (
          <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛒</div>
            <h3 className="t-title" style={{ marginBottom: 8 }}>No lists yet</h3>
            <p className="t-body" style={{ color: "var(--text-3)" }}>Create a shopping list and let your squad vote on what&apos;s needed.</p>
          </div>
        )}

        {/* Lists */}
        {lists.map(list => (
          <div key={list.id} className="card animate-in" style={{ overflow: "hidden" }}>
            {/* List header */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>{list.title}</p>
                <p className="t-caption" style={{ marginTop: 2 }}>{list.items.length} item{list.items.length !== 1 ? "s" : ""}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`badge ${list.status === "FUNDED" ? "badge-green" : ""}`}>{list.status}</span>
                <button onClick={() => setAddingItem(addingItem === list.id ? null : list.id)}
                  style={{ padding: "6px 12px", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", background: "var(--surface)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  + Item
                </button>
              </div>
            </div>

            {/* Add item form */}
            {addingItem === list.id && (
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
                <div className="form-stack">
                  <input className="input" placeholder="Item name (e.g. Match balls × 3)" value={newItem.name} onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <input className="input" type="number" placeholder="Est. cost ₹" value={newItem.estimatedCost} onChange={e => setNewItem(n => ({ ...n, estimatedCost: e.target.value }))} />
                    <input className="input" type="number" placeholder="Target ₹" value={newItem.targetAmount} onChange={e => setNewItem(n => ({ ...n, targetAmount: e.target.value }))} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button className="btn btn--primary btn--block" onClick={() => void addItem(list.id)}>Add</button>
                    <button className="btn btn--ghost btn--block" onClick={() => setAddingItem(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            {list.items.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center" }}>
                <p className="t-caption" style={{ color: "var(--text-4)" }}>No items yet. Add the first one above.</p>
              </div>
            ) : (
              list.items.map((item, i) => {
                const pct = item.target_amount && item.target_amount > 0
                  ? Math.min((item.totalContributed / item.target_amount) * 100, 100) : 0;
                const isVoting = voting === item.id;
                return (
                  <div key={item.id} style={{ padding: "14px 16px", borderBottom: i < list.items.length - 1 ? "1px solid var(--line)" : "none" }}>
                    {/* Item name + cost */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                      <div>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{item.name}</p>
                        {item.description && <p className="t-caption" style={{ marginTop: 2 }}>{item.description}</p>}
                      </div>
                      {item.estimated_cost && (
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--text-2)", flexShrink: 0 }}>
                          ₹{item.estimated_cost}
                        </span>
                      )}
                    </div>

                    {/* Vote row */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      <button
                        disabled={isVoting}
                        onClick={() => void vote(item.id, "NEEDED")}
                        style={{ flex: 1, padding: "8px", border: "1.5px solid", borderRadius: "var(--r-md)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, borderColor: item.myVote === "NEEDED" ? "var(--green)" : "var(--line)", background: item.myVote === "NEEDED" ? "var(--green-soft)" : "var(--surface)", color: item.myVote === "NEEDED" ? "#166534" : "var(--text-3)" }}>
                        👍 Needed ({item.votesNeeded})
                      </button>
                      <button
                        disabled={isVoting}
                        onClick={() => void vote(item.id, "NOT_NEEDED")}
                        style={{ flex: 1, padding: "8px", border: "1.5px solid", borderRadius: "var(--r-md)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, borderColor: item.myVote === "NOT_NEEDED" ? "var(--red)" : "var(--line)", background: item.myVote === "NOT_NEEDED" ? "var(--red-soft)" : "var(--surface)", color: item.myVote === "NOT_NEEDED" ? "#991b1b" : "var(--text-3)" }}>
                        👎 Skip ({item.votesNotNeeded})
                      </button>
                    </div>

                    {/* Contribution progress */}
                    {item.target_amount && item.target_amount > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <p className="t-caption">₹{item.totalContributed} raised of ₹{item.target_amount}</p>
                          {item.myContribution > 0 && <p className="t-caption" style={{ color: "var(--green)" }}>You: ₹{item.myContribution}</p>}
                        </div>
                        <div className="progress">
                          <div className="progress__fill progress__fill--green" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Contribute */}
                    {contributing === item.id ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input className="input" type="number" placeholder="₹ amount" value={contribAmount} onChange={e => setContribAmount(e.target.value)} style={{ flex: 1 }} />
                        <button onClick={() => void contribute(item.id)} style={{ padding: "0 14px", border: "none", borderRadius: "var(--r-md)", background: "var(--green)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                        <button onClick={() => setContributing(null)} style={{ padding: "0 12px", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", background: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>×</button>
                      </div>
                    ) : (
                      <button onClick={() => setContributing(item.id)}
                        style={{ padding: "8px 14px", border: "1.5px solid var(--blue-border)", borderRadius: "var(--r-md)", background: "var(--blue-soft)", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                        💰 Chip In
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
