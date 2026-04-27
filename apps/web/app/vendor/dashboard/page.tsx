"use client";
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { AuthPanel } from "@/components/shared/AuthPanel";
import { Loader } from "@/components/shared/Loader";
import { SPORT_OPTIONS } from "@/lib/constants";

// ── Types ────────────────────────────────────────────────────────────────────
type Vendor = {
  id: string; name: string; category: string; city: string;
  description: string | null; contact_phone: string | null;
  contact_email: string | null; gst_number: string | null;
  is_verified: boolean; logo_url: string | null; rating: number;
  review_count: number;
};
type Product = {
  id: string; vendor_id: string; name: string; description: string | null;
  category: string; price: number; unit: string; min_qty: number;
  stock: number | null; image_urls: string[]; sport_tags: string[]; is_active: boolean;
};

const PRODUCT_CATEGORIES = ["Kit","Equipment","Food","Photography","Physio","Transport","Other"];
const UNITS = ["item","pair","set","kg","litre","box","dozen"];

export default function VendorDashboardPage() {
  const { profile, isAuthenticated, loading: authLoading } = useAuth();

  const [vendor, setVendor]         = useState<Vendor | null>(null);
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"inventory" | "orders" | "settings">("inventory");

  // Product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct]       = useState<Product | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const emptyForm = { name: "", description: "", category: "Kit", price: "", unit: "item", minQty: "1", stock: "", sportTags: [] as string[], imageUrls: [] as string[] };
  const [form, setForm] = useState(emptyForm);
  const [formErr, setFormErr] = useState<string | null>(null);

  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated]);

  const load = async () => {
    setLoading(true);
    try {
      // Get vendor profile for this user
      const vRes = await fetch("/api/vendors/me", { credentials: "same-origin" });
      if (vRes.ok) {
        const d = await vRes.json() as { vendor: Vendor };
        setVendor(d.vendor);
        // Load products
        const pRes = await fetch(`/api/vendor/products?vendorId=${d.vendor.id}`, { credentials: "same-origin" });
        if (pRes.ok) {
          const pd = await pRes.json() as { products: Product[] };
          setProducts(pd.products);
        }
      }
    } finally { setLoading(false); }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("type", "product");
      const res = await fetch("/api/upload/product-image", { method: "POST", credentials: "same-origin", body: fd });
      if (!res.ok) return null;
      const d = await res.json() as { url: string };
      return d.url;
    } finally { setUploadingImage(false); }
  };

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setForm(f => ({ ...f, imageUrls: [...f.imageUrls, url] }));
  };

  const openEditProduct = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, description: p.description ?? "", category: p.category,
      price: String(p.price), unit: p.unit, minQty: String(p.min_qty),
      stock: p.stock != null ? String(p.stock) : "",
      sportTags: p.sport_tags, imageUrls: p.image_urls,
    });
    setShowAddProduct(true);
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { setFormErr("Product name is required"); return; }
    if (!form.price || Number(form.price) <= 0) { setFormErr("Enter a valid price"); return; }
    setSaving(true); setFormErr(null);
    try {
      if (editProduct) {
        await fetch("/api/vendor/products", {
          method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ productId: editProduct.id, ...form, price: Number(form.price), stock: form.stock ? Number(form.stock) : null, imageUrls: form.imageUrls }),
        });
      } else {
        await fetch("/api/vendor/products", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
          body: JSON.stringify({ ...form, price: Number(form.price), minQty: Number(form.minQty) || 1, stock: form.stock ? Number(form.stock) : null, imageUrls: form.imageUrls }),
        });
      }
      setShowAddProduct(false);
      setEditProduct(null);
      setForm(emptyForm);
      await load();
    } catch (e) { setFormErr(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Remove this product from your catalog?")) return;
    await fetch(`/api/vendor/products?productId=${productId}`, { method: "DELETE", credentials: "same-origin" });
    await load();
  };

  if (authLoading || loading) return <main><Loader label="Loading vendor dashboard…" /></main>;
  if (!isAuthenticated) return <main><div className="page"><AuthPanel title="Sign in to access your vendor dashboard" /></div></main>;

  // No vendor profile yet
  if (!vendor) {
    return (
      <main>
        <div className="page" style={{ textAlign: "center", paddingTop: 48 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🛍️</div>
          <h2 className="t-h2" style={{ marginBottom: 8 }}>Not registered as a vendor</h2>
          <p className="t-body" style={{ color: "var(--text-3)", marginBottom: 24 }}>
            Register your business on the Marketplace to start selling to sports teams.
          </p>
          <Link href="/marketplace/register?type=vendor">
            <button className="btn btn--primary">Register as a Vendor</button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="page">

        {/* ── Vendor header ── */}
        <div style={{ background: "linear-gradient(135deg, var(--blue) 0%, #1d4ed8 100%)", borderRadius: "var(--r-xl)", padding: "20px 20px 16px", color: "#fff" }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: "var(--r-md)", background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center", fontSize: 24, flexShrink: 0, overflow: "hidden" }}>
              {vendor.logo_url ? <img src={vendor.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🛍️"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 20 }}>{vendor.name}</h1>
                {vendor.is_verified && <span style={{ fontSize: 14 }}>✅</span>}
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 13, opacity: 0.75 }}>{vendor.category} · {vendor.city}</p>
            </div>
            <Link href="/marketplace/register?type=vendor&edit=1">
              <button style={{ padding: "6px 12px", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: "var(--r-full)", background: "transparent", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                Edit
              </button>
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { num: products.length, label: "Products" },
              { num: vendor.rating > 0 ? vendor.rating.toFixed(1) : "—", label: "Rating" },
              { num: vendor.review_count, label: "Reviews" },
            ].map(({ num, label }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: "var(--r-md)", padding: "10px", textAlign: "center" }}>
                <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 20, color: "#fff" }}>{num}</p>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.7 }}>{label}</p>
              </div>
            ))}
          </div>
          {!vendor.gst_number && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,193,7,0.2)", borderRadius: "var(--r-sm)", border: "1px solid rgba(255,193,7,0.4)" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#fef3c7", fontWeight: 600 }}>
                ⚠️ Add your GST number to get verified and appear higher in search results.
              </p>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="tab-bar">
          <button className={`tab ${tab === "inventory" ? "tab--active" : ""}`} onClick={() => setTab("inventory")}>
            📦 Inventory
          </button>
          <button className={`tab ${tab === "orders" ? "tab--active" : ""}`} onClick={() => setTab("orders")}>
            🛒 Orders
          </button>
          <button className={`tab ${tab === "settings" ? "tab--active" : ""}`} onClick={() => setTab("settings")}>
            ⚙️ Settings
          </button>
        </div>

        {/* ══════════════════════════ INVENTORY TAB ══════════════════════════ */}
        {tab === "inventory" && (
          <>
            {/* Add product button */}
            {!showAddProduct && (
              <button
                onClick={() => { setShowAddProduct(true); setEditProduct(null); setForm(emptyForm); }}
                style={{ width: "100%", minHeight: 48, border: "1.5px dashed var(--blue-border)", borderRadius: "var(--r-lg)", background: "var(--blue-soft)", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                + Add Product to Catalog
              </button>
            )}

            {/* Product form */}
            {showAddProduct && (
              <div className="card card-pad animate-in">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>
                    {editProduct ? "Edit Product" : "New Product"}
                  </p>
                  <button onClick={() => { setShowAddProduct(false); setEditProduct(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--text-3)" }}>×</button>
                </div>

                <div className="form-stack">
                  {/* Images */}
                  <div className="field">
                    <label className="field-label">Photos</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {form.imageUrls.map((url, i) => (
                        <div key={i} style={{ position: "relative", width: 72, height: 72 }}>
                          <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }} />
                          <button
                            onClick={() => setForm(f => ({ ...f, imageUrls: f.imageUrls.filter((_, j) => j !== i) }))}
                            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--red)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "grid", placeItems: "center" }}>
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                        style={{ width: 72, height: 72, borderRadius: "var(--r-md)", border: "1.5px dashed var(--line)", background: "var(--surface-2)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        {uploadingImage ? <div style={{ width: 18, height: 18, border: "2px solid var(--line)", borderTopColor: "var(--blue)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : <><span style={{ fontSize: 20 }}>📷</span><span style={{ fontSize: 10, color: "var(--text-4)" }}>Add</span></>}
                      </button>
                      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => void handleImagePick(e)} />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Product name *</label>
                    <input className="input" value={form.name} placeholder="Red cricket jersey (XL)" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>

                  <div className="field">
                    <label className="field-label">Description</label>
                    <textarea className="input" style={{ minHeight: 72 }} value={form.description} placeholder="Material, sizes, delivery time…" onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field">
                      <label className="field-label">Category *</label>
                      <select className="select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                        {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Unit</label>
                      <select className="select" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div className="field">
                      <label className="field-label">Price (₹) *</label>
                      <input className="input" type="number" value={form.price} placeholder="500" onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label className="field-label">Min order</label>
                      <input className="input" type="number" value={form.minQty} placeholder="1" onChange={e => setForm(f => ({ ...f, minQty: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label className="field-label">Stock</label>
                      <input className="input" type="number" value={form.stock} placeholder="∞" onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Sport tags</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {SPORT_OPTIONS.slice(0, 10).map(s => (
                        <button key={s} type="button"
                          onClick={() => setForm(f => ({ ...f, sportTags: f.sportTags.includes(s) ? f.sportTags.filter(x => x !== s) : [...f.sportTags, s] }))}
                          style={{ padding: "4px 10px", borderRadius: "var(--r-full)", border: "1.5px solid", borderColor: form.sportTags.includes(s) ? "var(--blue)" : "var(--line)", background: form.sportTags.includes(s) ? "var(--blue-soft)" : "var(--surface)", color: form.sportTags.includes(s) ? "var(--blue)" : "var(--text-3)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formErr && <p style={{ margin: 0, padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--red-soft)", color: "var(--red)", fontSize: 13, fontWeight: 600 }}>{formErr}</p>}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button className="btn btn--primary btn--block" disabled={saving} onClick={() => void saveProduct()}>
                      {saving ? "Saving…" : editProduct ? "Save Changes" : "Add to Catalog"}
                    </button>
                    <button className="btn btn--ghost btn--block" onClick={() => { setShowAddProduct(false); setEditProduct(null); }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Product list */}
            {products.length === 0 && !showAddProduct && (
              <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
                <h3 className="t-title" style={{ marginBottom: 8 }}>No products yet</h3>
                <p className="t-body" style={{ color: "var(--text-3)" }}>Add products to your catalog so captains can browse and order.</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.map(p => (
                <div key={p.id} className="card animate-in" style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", gap: 12, padding: "14px 16px" }}>
                    {/* Image */}
                    <div style={{ width: 72, height: 72, borderRadius: "var(--r-md)", background: "var(--surface-2)", overflow: "hidden", flexShrink: 0, border: "1px solid var(--line)" }}>
                      {p.image_urls?.[0]
                        ? <img src={p.image_urls[0]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 28 }}>📦</div>}
                    </div>
                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                        <span className="badge">{p.category}</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: "var(--green)" }}>₹{p.price} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-4)" }}>/ {p.unit}</span></p>
                      {p.description && <p className="t-caption" style={{ marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</p>}
                      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                        {p.stock != null && <span style={{ fontSize: 11, padding: "2px 8px", background: p.stock > 0 ? "var(--green-soft)" : "var(--red-soft)", borderRadius: "var(--r-full)", color: p.stock > 0 ? "#166534" : "var(--red)", fontWeight: 700 }}>Stock: {p.stock}</span>}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                          <button onClick={() => openEditProduct(p)} style={{ padding: "5px 12px", border: "1.5px solid var(--line)", borderRadius: "var(--r-md)", background: "none", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => void deleteProduct(p.id)} style={{ padding: "5px 12px", border: "1.5px solid var(--red-border)", borderRadius: "var(--r-md)", background: "var(--red-soft)", color: "var(--red)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Remove</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {p.image_urls?.length > 1 && (
                    <div style={{ display: "flex", gap: 6, padding: "0 16px 12px", overflowX: "auto" }}>
                      {p.image_urls.slice(1).map((url, i) => (
                        <img key={i} src={url} alt="" style={{ width: 48, height: 48, borderRadius: "var(--r-sm)", objectFit: "cover", flexShrink: 0, border: "1px solid var(--line)" }} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ══════════════════════════ ORDERS TAB ══════════════════════════ */}
        {tab === "orders" && (
          <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <h3 className="t-title" style={{ marginBottom: 8 }}>Orders coming soon</h3>
            <p className="t-body" style={{ color: "var(--text-3)" }}>
              When captains order from your catalog, orders appear here for you to accept and dispatch.
            </p>
          </div>
        )}

        {/* ══════════════════════════ SETTINGS TAB ══════════════════════════ */}
        {tab === "settings" && (
          <div className="card card-pad">
            <p style={{ margin: "0 0 16px", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15 }}>Business Details</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Business name", value: vendor.name },
                { label: "Category",      value: vendor.category },
                { label: "City",          value: vendor.city },
                { label: "Phone",         value: vendor.contact_phone ?? "—" },
                { label: "Email",         value: vendor.contact_email ?? "—" },
                { label: "GST",           value: vendor.gst_number ?? "Not added" },
                { label: "Verified",      value: vendor.is_verified ? "✅ Verified" : "⏳ Pending review" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
            <Link href="/marketplace/register?type=vendor&edit=1" style={{ display: "block", marginTop: 16 }}>
              <button className="btn btn--primary btn--block">Edit Business Details</button>
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
