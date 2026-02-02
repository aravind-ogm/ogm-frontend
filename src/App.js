import React, {useEffect, useState} from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    useNavigate,
} from "react-router-dom";

import PropertyCard from "./components/PropertyCard";
import AIResultCard from "./components/AIResultCard";
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import Contact from "./pages/Contact";
import PropertyDetails from "./pages/PropertyDetails";
import Footer from "./components/Footer";
import About from "./pages/About";
import SearchBar from "./search/SearchBar";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import "./styles/App.css";

/* ================= META PIXEL ROUTE TRACKER ================= */
function MetaPixelTracker() {
    const location = useLocation();

    useEffect(() => {
        if (window.fbq) {
            window.fbq("track", "PageView");
        }
    }, [location.pathname]);

    return null;
}

function App() {
    const [properties, setProperties] = useState([]);
    const [searchMode, setSearchMode] = useState("default");
    const [wishlist, setWishlist] = useState([]);
    const [watchlist, setWatchlist] = useState([]);

    const baseUrl = "https://ogm-backend-clean-879813720468.asia-south1.run.app";
    // const baseUrl = "http://localhost:8080";

    /* ================= LOAD PROPERTIES ================= */
    const loadProperties = async (query = "") => {
        try {
            const url = query
                ? `${baseUrl}/api/properties?q=${encodeURIComponent(
                    query
                )}&page=0&size=50`
                : `${baseUrl}/api/properties?page=0&size=50`;

            const res = await fetch(url);
            const data = await res.json();
            setProperties(data?.content || []);
        } catch (err) {
            console.error("Failed to fetch properties", err);
            setProperties([]);
        }
    };

    /* ================= UNIFIED SEARCH HANDLER ================= */
    const handleSearch = (data) => {
        // 🏠 LOGO CLICK / RESET
        if (data === null) {
            setSearchMode("default");
            loadProperties();
            return;
        }

        // 🤖 AI SEARCH
        if (Array.isArray(data)) {
            setProperties(data);
            setSearchMode("ai");
            return;
        }

        // 🔍 NORMAL SEARCH
        setSearchMode("normal");
        loadProperties(data);
    };

    const handleWishlist = (property) => {
        setWishlist((prev) =>
            prev.some((p) => p.id === property.id) ? prev : [...prev, property]
        );
    };

    const handleWatchlist = (property) => {
        setWatchlist((prev) =>
            prev.some((p) => p.id === property.id) ? prev : [...prev, property]
        );
    };

    /* ================= INITIAL LOAD ================= */
    useEffect(() => {
        loadProperties();
        setSearchMode("default");
    }, []);

    return (
        <Router>
            <MetaPixelTracker/>

            <div className="app-container">
                {/* 🔑 HEADER MUST RECEIVE onSearch */}
                <Header onSearch={handleSearch}/>

                <Routes>
                    <Route
                        path="/"
                        element={
                            <main className="main-section">
                                {/* AI SUGGESTIONS */}
                                {searchMode === "ai" && (
                                    <div className="ai-suggestions premium">
                                        <div className="ai-suggestion-card">
                                            ✨ <strong>Refine your search</strong>
                                            <p>
                                                Find <b>2 BHKs under ₹2 Cr</b> in{" "}
                                                <b>Sarjapur Road</b>
                                            </p>
                                        </div>

                                        <div className="ai-suggestion-card">
                                            📊 <strong>Compare smarter</strong>
                                            <p>
                                                Add properties to your <b>watchlist</b> and compare
                                                easily.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* SEARCH BAR */}
                                {searchMode !== "ai" && (
                                    <SearchBar onSearch={handleSearch}/>
                                )}

                                {/* TITLE */}
                                <h2 className="section-title">
                                    {searchMode === "default"
                                        ? "Popular Homes in Bengaluru"
                                        : searchMode === "ai"
                                            ? "AI Curated Properties"
                                            : "Search Results"}
                                </h2>

                                {/* PROPERTY LIST */}
                                <PropertyList
                                    properties={properties}
                                    searchMode={searchMode}
                                    onWishlist={handleWishlist}
                                    onWatchlist={handleWatchlist}
                                />

                                {/* AI BOTTOM SEARCH */}
                                {searchMode === "ai" && (
                                    <div className="ai-bottom-search">
                                        <div className="ai-refine-hint">
                                            🔎 Try “under 2 Cr”, “near Wipro”, “with clubhouse”
                                        </div>
                                        <SearchBar onSearch={handleSearch} mode="ai"/>
                                    </div>
                                )}
                            </main>
                        }
                    />

                    <Route path="/property/:slug" element={<PropertyDetails/>}/>
                    <Route path="/about" element={<About/>}/>
                    <Route path="/privacy-policy" element={<PrivacyPolicy/>}/>
                    <Route path="/contact" element={<Contact/>}/>
                </Routes>

                <FloatingWhatsapp/>
                <Footer/>
            </div>
        </Router>
    );
}

export default App;

/* ================= HEADER ================= */

function Header({onSearch}) {
    const navigate = useNavigate();

    const handleLogoClick = () => {
        // RESET STATE
        if (onSearch) {
            onSearch(null);
        }

        // FORCE HOME NAVIGATION
        navigate("/", {replace: true});
    };

    return (
        <header className="topbar">
            <div
                className="header-left header-content"
                onClick={handleLogoClick}
                style={{cursor: "pointer"}}
            >
                <img
                    src="/logo.png"
                    alt="OGM Logo"
                    className="logo-img"
                    style={{height: "50px"}}
                />
                <h1 className="header-title">One Global Marketplace</h1>
            </div>

            <div className="header-actions">
                <button
                    className="contact"
                    onClick={() => {
                        window.fbq && window.fbq("track", "Lead");
                        navigate("/contact");
                    }}
                >
                    Contact Us
                </button>
            </div>
        </header>
    );
}

/* ================= PROPERTY LIST ================= */

function PropertyList({
                          properties,
                          searchMode,
                          onWishlist,
                          onWatchlist,
                      }) {
    if (!properties || properties.length === 0) {
        return <p>No properties found.</p>;
    }

    if (searchMode === "ai") {
        return (
            <div className="ai-results">
                {properties.map((prop) => (
                    <AIResultCard
                        key={prop.id}
                        property={prop}
                        onWishlist={onWishlist}
                        onWatchlist={onWatchlist}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="property-grid">
            {properties.map((prop) => (
                <PropertyCard key={prop.id} property={prop}/>
            ))}
        </div>
    );
}
