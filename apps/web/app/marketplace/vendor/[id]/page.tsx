"use client";
/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/hooks/useAuth";

type Vendor = {
  id: string; name: string; category: string; description: string | null;
  city: string; contact_phone: string | null; contact_email: string | null;
  website: string | null; price_note: string | null; sports: string[];
  is_verified: boolean; logo_url: string | null;
};

type Product = {
  id: string; name: string; description: string | null; category: string;
  price: number; unit: string; min_qty: number; stock: number | null;
  image_urls: string[]; sport_tags: string[]; is_active: boolean;
};

type CartItem = { product: Product; qty: number };

const CATEGORY_ICONS: Record<string, string> = {
  Kit: "👕", Equipment: "⚽", Food: "🍱", Photography: "📸",
  Physio: "🏥", Transport: "🚌", Other: "🛍️",
};

export default function VendorStorefrontPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, profile } = useAuth();

  const [vendor,   setVendor]   = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [cart,     setCart]     = useState<CartItem[]>([]);
  const [catFilter, setCatFilter] = useState("All");
  const [enquiring, setEnquiring] = useState<string | null>(null);
  const [enquiryDone, setEnquiryDone] = useState<Set<string>>(new Set());
  const [showCart,   setShowCart] = useState(false);
  const [orderSent,  setOrderSent] = useState(false);

  useEffect(() => { void load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const [vRes, pRes] = await Promise.all([
        fetch(`/api/vendors/${id}`),
        fetch(`/api/vendor/products?vendorId=${id}`, { credentials: "same-origin" }),
      ]);
      const vData = await vRes.json() as { vendor: Vendor };
      const pData = await pRes.json() as { products: Product[] };
      setVendor(vData.vendor ?? null);
      setProducts(pData.products ?? []);
    } finally { setLoading(false); }
  };

  const addToCart = (product: Product) => {
    setCart(c => {
      const existing = c.find(i => i.product.id === product.id);
      if (existing) return c.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { product, qty: Math.max(1, product.min_qty) }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(c => c
      .map(i => i.product.id === productId ? { ...i, qty: Math.max(i.product.min_qty, i.qty + delta) } : i)
      .filter(i => i.qty > 0)
    );
  };

  const removeFromCart = (productId: string) => setCart(c => c.filter(i => i.product.id !== productId));

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const sendEnquiry = async (product: Product) => {
    if (!vendor?.contact_phone) return;
    setEnquiring(product.id);
    const name    = profile?.displayName ?? profile?.fullName ?? "a customer";
    const message = `Hi, I found your listing on Korum! I'm interested in ordering:\n\n` +
      `*${product.name}* (₹${product.price}/${product.unit})\n` +
      `Minimum: ${product.min_qty} ${product.unit}\n\n` +
      `Could you share availability and delivery details? — ${name}`;
    window.open(`https://wa.me/${vendor.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    setEnquiryDone(s => new Set([...s, product.id]));
    setEnquiring(null);
  };

  const sendCartOrder = async () => {
    if (!vendor?.contact_phone || cart.length === 0) return;
    const name    = profile?.displayName ?? profile?.fullName ?? "a customer";
    const items   = cart.map(i => `• ${i.product.name} × ${i.qty} — ₹${(i.product.price * i.qty).toLocaleString("en-IN")}`).join("\n");
    const message = `Hi, I'm ordering from Korum!\n\n${items}\n\n*Total: ₹${cartTotal.toLocaleString("en-IN")}*\n\nPlease confirm availability and delivery — ${name}`;
    window.open(`https://wa.me/${vendor.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
    setOrderSent(true);
    setTimeout(() => { setShowCart(false); setCart([]); setOrderSent(false); }, 3000);
  };

  if (loading) return <main><Loader label="Loading vendor…" /></main>;
  if (!vendor) return <main><div className="page"><p className="t-body" style={{ textAlign: "center", paddingTop: 40 }}>Vendor not found.</p></div></main>;

  const categories = ["All", ...new Set(products.map(p => p.category))];
  const displayed  = catFilter === "All" ? products : products.filter(p => p.category === catFilter);

  return (
    <main>
      <div className="page">

        {/* Vendor header */}
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ height: 4, background: vendor.is_verified ? "var(--green)" : "var(--blue)" }} />
          <div style={{ padding: "16px 16px 14px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--blue-soft)", display: "grid", placeItems: "center", fontSize: 26, flexShrink: 0, border: "1.5px solid var(--blue-border)" }}>
              {CATEGORY_ICONS[vendor.category] ?? "🛍️"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 20 }}>{vendor.name}</h1>
                {vendor.is_verified && <span title="Verified">✅</span>}
              </div>
              <p className="t-caption">📍 {vendor.city} · {vendor.category}</p>
              {vendor.description && (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{vendor.description}</p>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {vendor.sports?.map(s => <span key={s} className="badge">{s}</span>)}
                {vendor.price_note && (
                  <span style={{ fontSize: 11, padding: "2px 8px", background: "var(--amber-soft)", borderRadius: "var(--r-full)", color: "#92400e", border: "1px solid var(--amber-border)", fontWeight: 600 }}>
                    {vendor.price_note}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact row */}
          <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
            {vendor.contact_phone && (
              <a href={`tel:${vendor.contact_phone}`}
                style={{ flex: 1, padding: "10px", textAlign: "center", background: "var(--surface-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                📞 Call
              </a>
            )}
            {vendor.contact_phone && (
              <a href={`https://wa.me/${vendor.contact_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: "10px", textAlign: "center", background: "#dcfce7", borderRadius: "var(--r-md)", border: "1px solid #bbf7d0", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "#166534", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                💬 WhatsApp
              </a>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noreferrer"
                style={{ flex: 1, padding: "10px", textAlign: "center", background: "var(--blue-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--blue-border)", fontSize: 13, fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--blue)", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                🌐 Website
              </a>
            )}
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: "var(--r-full)", border: "1.5px solid", borderColor: catFilter === c ? "var(--blue)" : "var(--line)", background: catFilter === c ? "var(--blue)" : "var(--surface)", color: catFilter === c ? "#fff" : "var(--text-2)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        {displayed.length === 0 ? (
          <div className="card card-pad" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
            <p className="t-title">No products listed yet</p>
            <p className="t-caption" style={{ marginTop: 6 }}>Contact the vendor directly to enquire.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayed.map(product => {
              const inCart   = cart.find(i => i.product.id === product.id);
              const enquired = enquiryDone.has(product.id);
              const outOfStock = product.stock !== null && product.stock <= 0;

              return (
                <div key={product.id} className="card animate-in" style={{ overflow: "hidden" }}>
                  {/* Product image placeholder / category icon */}
                  <div style={{ display: "flex", gap: 14, padding: "14px 16px" }}>
                    <div style={{ width: 64, height: 64, borderRadius: "var(--r-md)", background: "var(--surface-2)", border: "1px solid var(--line)", display: "grid", placeItems: "center", fontSize: 28, flexShrink: 0, overflow: "hidden" }}>
                      {product.image_urls?.[0]
                        ? <img src={product.image_urls[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : (CATEGORY_ICONS[product.category] ?? "📦")
                      }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{product.name}</p>
                        {outOfStock && <span style={{ padding: "2px 8px", borderRadius: "var(--r-full)", background: "var(--red-soft)", color: "var(--red)", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Out of stock</span>}
                      </div>
                      {product.description && (
                        <p className="t-caption" style={{ marginTop: 4, lineHeight: 1.5 }}>{product.description}</p>
                      )}
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: "var(--blue)" }}>
                          ₹{product.price.toLocaleString("en-IN")}
                        </span>
                        <span className="t-caption">/{product.unit}</span>
                        {product.min_qty > 1 && (
                          <span className="t-caption" style={{ color: "var(--text-4)" }}>· min {product.min_qty}</span>
                        )}
                      </div>
                      {product.sport_tags?.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                          {product.sport_tags.map(s => <span key={s} className="badge" style={{ fontSize: 10 }}>{s}</span>)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cart / enquiry actions */}
                  <div style={{ padding: "0 16px 14px", display: "flex", gap: 8 }}>
                    {inCart ? (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--blue-soft)", borderRadius: "var(--r-md)", border: "1px solid var(--blue-border)" }}>
                        <button onClick={() => updateQty(product.id, -1)}
                          style={{ width: 32, height: 32, border: "none", borderRadius: "50%", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, cursor: "pointer", display: "grid", placeItems: "center" }}>−</button>
                        <span style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--blue)" }}>{inCart.qty}</span>
                        <button onClick={() => updateQty(product.id, 1)}
                          style={{ width: 32, height: 32, border: "none", borderRadius: "50%", background: "var(--blue)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, cursor: "pointer", display: "grid", placeItems: "center" }}>+</button>
                        <button onClick={() => removeFromCart(product.id)}
                          style={{ width: 32, height: 32, border: "none", borderRadius: "50%", background: "var(--red-soft)", color: "var(--red)", cursor: "pointer", fontSize: 16 }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} disabled={outOfStock}
                        style={{ flex: 1, padding: "10px", border: "1.5px solid var(--blue-border)", borderRadius: "var(--r-md)", background: "var(--blue-soft)", color: "var(--blue)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, cursor: outOfStock ? "not-allowed" : "pointer", opacity: outOfStock ? 0.5 : 1 }}>
                        🛒 Add to order
                      </button>
                    )}

                    {/* WhatsApp enquiry */}
                    {vendor.contact_phone && (
                      <button onClick={() => void sendEnquiry(product)} disabled={enquiring === product.id}
                        style={{ padding: "10px 14px", border: "none", borderRadius: "var(--r-md)", background: enquired ? "#dcfce7" : "#25D366", color: enquired ? "#166534" : "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
                        {enquired ? "✓ Sent" : "💬"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cart FAB */}
        {cart.length > 0 && (
          <div style={{ position: "fixed", bottom: "calc(var(--tab-h) + 16px)", right: 16, zIndex: 100 }}>
            <button onClick={() => setShowCart(true)}
              style={{ width: 64, height: 64, borderRadius: "50%", border: "none", background: "var(--blue)", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(37,99,235,0.4)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              🛒
              <span style={{ position: "absolute", top: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: "var(--red)", color: "#fff", fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 800, display: "grid", placeItems: "center", border: "2px solid #fff" }}>
                {cartCount}
              </span>
            </button>
          </div>
        )}

        {/* Cart sheet */}
        {showCart && (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column" }}>
            {/* Backdrop */}
            <div onClick={() => setShowCart(false)} style={{ flex: 1, background: "rgba(0,0,0,0.4)" }} />
            {/* Sheet */}
            <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 16px 32px", maxHeight: "80dvh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18 }}>Your Order</h2>
                <button onClick={() => setShowCart(false)} style={{ border: "none", background: "none", fontSize: 22, cursor: "pointer", color: "var(--text-3)" }}>✕</button>
              </div>

              {orderSent ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18 }}>Order sent via WhatsApp!</p>
                  <p className="t-caption" style={{ marginTop: 6 }}>The vendor will confirm details shortly.</p>
                </div>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.product.id} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                      <div style={{ fontSize: 24 }}>{CATEGORY_ICONS[item.product.category] ?? "📦"}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{item.product.name}</p>
                        <p className="t-caption">₹{item.product.price} × {item.qty}</p>
                      </div>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--blue)" }}>
                        ₹{(item.product.price * item.qty).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}

                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid var(--line)", marginBottom: 16 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>Total</span>
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 20, color: "var(--blue)" }}>₹{cartTotal.toLocaleString("en-IN")}</span>
                  </div>

                  <p className="t-caption" style={{ marginBottom: 12 }}>
                    Clicking below will open WhatsApp with your order details. The vendor will confirm and arrange payment/delivery.
                  </p>

                  <button onClick={() => void sendCartOrder()}
                    style={{ width: "100%", padding: "14px", border: "none", borderRadius: "var(--r-lg)", background: "#25D366", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Send Order via WhatsApp
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
