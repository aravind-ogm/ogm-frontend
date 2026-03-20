import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatPrice = (price) => {
    const n = Number(price);
    if (!price || isNaN(n)) return "Price on request";
    if (n >= 10_000_000) return `₹ ${(n / 10_000_000).toFixed(2)} Cr`;
    if (n >= 100_000)    return `₹ ${(n / 100_000).toFixed(2)} Lakhs`;
    return `₹ ${n.toLocaleString("en-IN")}`;
};

// Generate next 14 days of available time slots (9AM–6PM, hourly)
const generateSlots = () => {
    const slots = [];
    const now = new Date();
    for (let d = 1; d <= 14; d++) {
        const date = new Date(now);
        date.setDate(now.getDate() + d);
        const dateStr = date.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
        const times = [];
        for (let h = 9; h <= 18; h++) {
            const hour = h > 12 ? h - 12 : h;
            const ampm = h >= 12 ? "PM" : "AM";
            const iso  = new Date(date.setHours(h, 0, 0, 0)).toISOString().slice(0, 19);
            times.push({ label: `${hour}:00 ${ampm}`, iso });
        }
        slots.push({ dateStr, date: date.toDateString(), times });
    }
    return slots;
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BookTourPage() {
    const { slug } = useParams();
    const navigate  = useNavigate();

    const [property,     setProperty]     = useState(null);
    const [loadingProp,  setLoadingProp]  = useState(true);
    const [slots]                         = useState(generateSlots);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [step,         setStep]         = useState(1); // 1=pick slot, 2=fill details, 3=confirmed
    const [form,         setForm]         = useState({ name: "", mobile: "", email: "", note: "" });
    const [saving,       setSaving]       = useState(false);
    const [error,        setError]        = useState("");
    const [booking,      setBooking]      = useState(null);

    // Fetch property details
    useEffect(() => {
        fetch(`${API_BASE}/api/properties/slug/${slug}`)
            .then(r => r.json())
            .then(setProperty)
            .catch(() => {})
            .finally(() => setLoadingProp(false));
    }, [slug]);

    const mainImage = property?.mainImages?.[0] || property?.images?.[0] || property?.image;

    const handleSlotSelect = (time) => {
        setSelectedSlot(time);
        setStep(2);
    };

    const handleBook = async () => {
        if (!form.name || !form.mobile) { setError("Name and mobile are required."); return; }
        if (!selectedSlot) { setError("Please select a time slot."); return; }
        setSaving(true); setError("");
        try {
            const res = await fetch(`${API_BASE}/api/agent/book-call`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    propertyId:     property?.id,
                    customerName:   form.name,
                    customerMobile: form.mobile,
                    note:           form.note || `Customer booking for ${property?.title}`,
                    scheduledAt:    selectedSlot.iso,
                    source:         "CUSTOMER_BOOKING",
                }),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setBooking(data);
            setStep(3);
        } catch {
            setError("Booking failed. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // ── Styles ──────────────────────────────────────────────────────────────
    const s = {
        page:        { minHeight: "100vh", background: "#f4f6fb", fontFamily: "'Inter', sans-serif" },
        nav:         { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" },
        navLogo:     { fontWeight: 800, fontSize: 18, color: "#0f172a", textDecoration: "none" },
        back:        { fontSize: 13, color: "#64748b", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 },
        container:   { maxWidth: 1100, margin: "0 auto", padding: "36px 40px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 24, alignItems: "start" },
        card:        { background: "#fff", borderRadius: 20, boxShadow: "0 2px 20px rgba(15,23,42,0.07)", overflow: "hidden" },
        propImg:     { width: "100%", height: 180, objectFit: "cover", display: "block" },
        propInfo:    { padding: "16px 18px" },
        propTitle:   { fontWeight: 800, fontSize: 15, color: "#0f172a", margin: "0 0 5px" },
        propMeta:    { fontSize: 12, color: "#64748b", margin: "0 0 8px" },
        propPrice:   { fontWeight: 800, fontSize: 17, color: "#0b63e5" },
        sectionHead: { padding: "20px 22px 14px", borderBottom: "1px solid #f1f5f9" },
        sectionTitle:{ fontWeight: 800, fontSize: 16, color: "#0f172a", margin: 0 },
        sectionSub:  { fontSize: 13, color: "#94a3b8", margin: "4px 0 0" },
        dateRow:     { display: "flex", gap: 8, padding: "16px 22px", overflowX: "auto", borderBottom: "1px solid #f1f5f9" },
        datePill:    (active) => ({
            flexShrink: 0, padding: "8px 16px", borderRadius: 30, border: `1.5px solid ${active ? "#0b63e5" : "#e2e8f0"}`,
            background: active ? "#0b63e5" : "#fff", color: active ? "#fff" : "#334155",
            fontWeight: 700, fontSize: 12, cursor: "pointer", transition: "all 0.18s",
        }),
        slotsGrid:   { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "18px 22px 22px" },
        slot:        (active) => ({
            padding: "10px 0", borderRadius: 10, border: `1.5px solid ${active ? "#0b63e5" : "#e2e8f0"}`,
            background: active ? "#eff6ff" : "#fff", color: active ? "#0b63e5" : "#334155",
            fontWeight: 700, fontSize: 13, cursor: "pointer", textAlign: "center", transition: "all 0.18s",
        }),
        formCard:    { background: "#fff", borderRadius: 20, boxShadow: "0 2px 20px rgba(15,23,42,0.07)", padding: "24px" },
        label:       { display: "block", fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" },
        input:       { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 16 },
        btn:         { width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#0b63e5", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", transition: "all 0.2s" },
        confirmCard: { textAlign: "center", padding: "40px 28px" },
    };

    if (loadingProp) return (
        <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 44, height: 44, border: "3px solid #e2e8f0", borderTopColor: "#0b63e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // ── Step 3: Confirmed ────────────────────────────────────────────────────
    if (step === 3) return (
        <div style={s.page}>
            <nav style={s.nav}>
                <Link to="/" style={s.navLogo}>🏠 OGM</Link>
            </nav>
            <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 20px" }}>
                <div style={{ ...s.card, ...s.confirmCard }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
                    <h2 style={{ fontWeight: 800, fontSize: 22, color: "#0f172a", margin: "0 0 10px" }}>Tour Booked!</h2>
                    <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px", lineHeight: 1.6 }}>
                        Your live property tour has been scheduled.<br />
                        Our agent will call you at the confirmed time.
                    </p>
                    <div style={{ background: "#f8fafc", borderRadius: 14, padding: "18px 22px", marginBottom: 24, textAlign: "left" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 8 }}>{property?.title}</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>📅 {booking?.scheduledAtFormatted || selectedSlot?.label}</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>👤 {form.name}</div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>📞 {form.mobile}</div>
                    </div>
                    <Link to={`/property/${slug}`} style={{ ...s.btn, display: "block", textDecoration: "none", textAlign: "center", lineHeight: "1.6" }}>
                        Back to Property
                    </Link>
                </div>
            </div>
        </div>
    );

    const currentDaySlots = selectedDate
        ? slots.find(s => s.date === selectedDate)?.times || []
        : slots[0]?.times || [];

    const activeDateStr = selectedDate || slots[0]?.date;

    return (
        <div style={s.page}>
            {/* Nav */}
            <nav style={s.nav}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <Link to="/" style={s.navLogo}>🏠 OGM</Link>
                    <div style={{ width: 1, height: 20, background: "#e2e8f0" }} />
                    <Link to={`/property/${slug}`} style={s.back}>
                        ← Back to property
                    </Link>
                </div>
            </nav>

            <div style={s.container}>
                {/* Left — slot picker */}
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: 24, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.4px" }}>
                        Book a Live Tour
                    </h1>
                    <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>
                        Pick a date and time — our agent will call you via live video.
                    </p>

                    {/* Step indicator */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
                        {["Pick a slot", "Your details", "Confirmed"].map((label, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                    background: step > i + 1 ? "#22c55e" : step === i + 1 ? "#0b63e5" : "#e2e8f0",
                                    color: step >= i + 1 ? "#fff" : "#94a3b8", fontWeight: 800, fontSize: 12,
                                }}>
                                    {step > i + 1 ? "✓" : i + 1}
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 600, color: step === i + 1 ? "#0f172a" : "#94a3b8" }}>{label}</span>
                                {i < 2 && <span style={{ color: "#e2e8f0", marginLeft: 2 }}>›</span>}
                            </div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div style={s.card}>
                            <div style={s.sectionHead}>
                                <p style={s.sectionTitle}>Select a Date</p>
                                <p style={s.sectionSub}>Next 14 days available</p>
                            </div>
                            {/* Date pills */}
                            <div style={s.dateRow}>
                                {slots.map(sl => (
                                    <button
                                        key={sl.date}
                                        style={s.datePill(activeDateStr === sl.date)}
                                        onClick={() => setSelectedDate(sl.date)}
                                    >
                                        {sl.dateStr}
                                    </button>
                                ))}
                            </div>
                            {/* Time slots */}
                            <div style={{ ...s.sectionHead, borderTop: "1px solid #f1f5f9", borderBottom: "none" }}>
                                <p style={s.sectionTitle}>Select a Time</p>
                            </div>
                            <div style={s.slotsGrid}>
                                {currentDaySlots.map(t => (
                                    <button
                                        key={t.iso}
                                        style={s.slot(selectedSlot?.iso === t.iso)}
                                        onClick={() => handleSlotSelect(t)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={s.card}>
                            <div style={{ ...s.sectionHead, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div>
                                    <p style={s.sectionTitle}>Your Details</p>
                                    <p style={s.sectionSub}>📅 {selectedSlot?.label} · {slots.find(s => s.date === activeDateStr)?.dateStr}</p>
                                </div>
                                <button onClick={() => setStep(1)} style={{ fontSize: 13, color: "#0b63e5", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                                    ← Change slot
                                </button>
                            </div>
                            <div style={{ padding: "20px 22px" }}>
                                {error && (
                                    <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                                        {error}
                                    </div>
                                )}
                                <label style={s.label}>Full Name *</label>
                                <input style={s.input} placeholder="Rahul Sharma" value={form.name} onChange={e => set("name", e.target.value)} />

                                <label style={s.label}>Mobile Number *</label>
                                <input style={s.input} placeholder="9876543210" value={form.mobile} onChange={e => set("mobile", e.target.value)} />

                                <label style={s.label}>Email (optional)</label>
                                <input style={s.input} placeholder="rahul@email.com" value={form.email} onChange={e => set("email", e.target.value)} />

                                <label style={s.label}>Any questions or notes?</label>
                                <textarea
                                    style={{ ...s.input, height: 80, resize: "vertical" }}
                                    placeholder="e.g. Interested in 2BHK, want to discuss pricing..."
                                    value={form.note}
                                    onChange={e => set("note", e.target.value)}
                                />

                                <button style={s.btn} onClick={handleBook} disabled={saving}>
                                    {saving ? "Booking…" : "Confirm Booking →"}
                                </button>
                                <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 12 }}>
                                    By booking, you agree to be contacted by our agent at the scheduled time.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right — property card */}
                <div>
                    <div style={s.card}>
                        {mainImage && <img src={mainImage} alt={property?.title} style={s.propImg} />}
                        <div style={s.propInfo}>
                            <h3 style={s.propTitle}>{property?.title}</h3>
                            <p style={s.propMeta}>📍 {property?.location}</p>
                            <p style={s.propPrice}>{formatPrice(property?.price)}</p>
                            {property?.type && (
                                <span style={{ display: "inline-block", background: "#eff6ff", color: "#0b63e5", fontWeight: 700, fontSize: 11, padding: "3px 10px", borderRadius: 20, marginTop: 8 }}>
                                    {property.type}
                                </span>
                            )}
                            {property?.sqft && (
                                <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>{property.sqft} sqft</p>
                            )}
                        </div>
                    </div>

                    {/* Why book info */}
                    <div style={{ ...s.card, marginTop: 16, padding: "20px 22px" }}>
                        <p style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", margin: "0 0 14px" }}>Why book a Live Tour?</p>
                        {[
                            ["🎥", "See the property live via video"],
                            ["💬", "Ask questions in real-time"],
                            ["📅", "Flexible scheduling — pick your slot"],
                            ["🔒", "No commitment required"],
                        ].map(([icon, text]) => (
                            <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                                <span style={{ fontSize: 16 }}>{icon}</span>
                                <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}