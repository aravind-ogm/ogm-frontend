import React, { useEffect, useState, useCallback } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    useNavigate,
} from "react-router-dom";

// Components
import SearchBarContainer from "./search/SearchBarContainer";
import PropertyCard from "./components/PropertyCard";
import AIResultCard from "./components/property/AIResultCard";
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import Footer from "./components/Footer";
import AuthContainer from "./components/ogm-auth/AuthContainer";

// Pages
import Contact from "./pages/Contact";
import PropertyDetails from "./pages/PropertyDetails";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AiSearchPage from "./pages/AiSearchPage";

// Styles
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

/* ================= MAIN APP ================= */

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

/* ================= APP CONTENT (NO LOGIC CHANGED) ================= */

function AppContent() {
    const location = useLocation();
    const navigate = useNavigate();

    const [properties, setProperties] = useState([]);
    const [searchMode, setSearchMode] = useState("default");
    const [isAuthenticated, setIsAuthenticated] = useState(
        Boolean(localStorage.getItem("token"))
    );

    const baseUrl = "http://localhost:8080";

    /* ================= DATA LOADING ================= */

    const loadProperties = useCallback(async (query = "") => {
        try {
            const url = query
                ? `${baseUrl}/api/properties?q=${encodeURIComponent(query)}&page=0&size=50`
                : `${baseUrl}/api/properties?page=0&size=50`;

            const res = await fetch(url);
            const data = await res.json();
            setProperties(data?.content || []);
        } catch (err) {
            console.error("Failed to fetch properties", err);
            setProperties([]);
        }
    }, [baseUrl]);

    /* ================= SEARCH HANDLER ================= */

    const handleSearch = (data) => {
        if (data === null) {
            setSearchMode("default");
            loadProperties();
            return;
        }

        if (Array.isArray(data)) {
            setProperties(data);
            setSearchMode("ai");
            return;
        }

        setSearchMode("normal");
        loadProperties(data);
    };

    useEffect(() => {
        loadProperties();
    }, [loadProperties]);

    /* ================= FOOTER HIDE LOGIC ================= */

    const hideFooterRoutes = [
        "/ai-search",
        "/dashboard",
        "/admin"
    ];

    const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

    /* ================= RENDER ================= */

    return (
        <>
            <MetaPixelTracker />

            <div className="app-container">
                <Header
                    onSearch={handleSearch}
                    isAuthenticated={isAuthenticated}
                    onLogout={() => {
                        localStorage.removeItem("token");
                        setIsAuthenticated(false);
                    }}
                />

                <Routes>
                    <Route
                        path="/"
                        element={
                            <main className="main-section">
                                {searchMode === "ai" && (
                                    <div className="ai-suggestions premium">
                                        <div className="ai-suggestion-card">
                                            ✨ <strong>Refine your search</strong>
                                            <p>Find <b>2 BHKs under ₹2 Cr</b> in <b>Sarjapur Road</b></p>
                                        </div>
                                        <div className="ai-suggestion-card">
                                            📊 <strong>Compare smarter</strong>
                                            <p>Add properties to your <b>watchlist</b> and compare easily.</p>
                                        </div>
                                    </div>
                                )}

                                {searchMode !== "ai" && (
                                    <SearchBarContainer onSearch={handleSearch} />
                                )}

                                <h2 className="section-title">
                                    {searchMode === "default" && "Popular Homes in Bengaluru"}
                                    {searchMode === "ai" && "AI Curated Properties"}
                                    {searchMode === "normal" && "Search Results"}
                                </h2>

                                <PropertyList
                                    properties={properties}
                                    searchMode={searchMode}
                                />
                            </main>
                        }
                    />

                    <Route path="/property/:slug" element={<PropertyDetails />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/ai-search" element={<AiSearchPage />} />
                    <Route
                        path="/auth"
                        element={<AuthContainer onAuthSuccess={() => setIsAuthenticated(true)} />}
                    />
                </Routes>

                <FloatingWhatsapp />

                {!shouldHideFooter && <Footer />}
            </div>
        </>
    );
}

/* ================= HEADER ================= */

function Header({ onSearch, isAuthenticated, onLogout }) {
    const navigate = useNavigate();

    const handleLogoClick = () => {
        onSearch && onSearch(null);
        navigate("/", { replace: true });
    };

    return (
        <header className="topbar">
            <div
                className="header-left header-content"
                onClick={handleLogoClick}
                style={{ cursor: "pointer" }}
            >
                <img src="/logo.png" alt="OGM Logo" className="logo-img" style={{ height: "50px" }} />
                <h1 className="header-title">One Global Marketplace</h1>
            </div>

            <div className="header-actions">
                {isAuthenticated ? (
                    <button className="contact" onClick={onLogout}>Logout</button>
                ) : (
                    <button className="contact" onClick={() => navigate("/auth")}>Login</button>
                )}
            </div>
        </header>
    );
}

/* ================= PROPERTY LIST ================= */

function PropertyList({ properties, searchMode }) {
    if (!properties || properties.length === 0) {
        return (
            <div className="no-results-container">
                <div className="no-results-content">
                    <div className="no-results-icon">🏠</div>
                    <h3>No properties found</h3>
                    <p>We couldn't find any listings matching your current criteria.</p>
                    <button
                        className="reset-search-btn"
                        onClick={() => window.location.reload()}
                    >
                        Clear all filters
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={searchMode === "ai" ? "ai-results" : "property-grid"}>
            {properties.map((prop) =>
                searchMode === "ai" ? (
                    <AIResultCard key={prop.id} property={prop} />
                ) : (
                    <PropertyCard key={prop.id} property={prop} />
                )
            )}
        </div>
    );
}

export default App;