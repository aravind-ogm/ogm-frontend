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
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import Footer from "./components/Footer";
import AuthContainer from "./components/ogm-auth/AuthContainer";

// Pages
import Contact from "./pages/Contact";
import PropertyDetails from "./pages/PropertyDetails";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AiSearchPage from "./components/ai/AiSearchPage";

// Agent Admin Dashboard
import AgentAdminApp from "./components/admindashboard/Agentadminapp";

// Booking
import BookTourPage from "./components/admindashboard/BookTourPage";

import "./styles/App.css";

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = process.env.REACT_APP_API_BASE || "http://localhost:8080";

const HIDE_FOOTER_ROUTES = new Set(["/ai-search", "/dashboard", "/admin", "/agent-admin", "/book"]);

// ─── Meta Pixel Tracker ──────────────────────────────────────────────────────

function MetaPixelTracker() {
    const location = useLocation();

    useEffect(() => {
        window.fbq?.("track", "PageView");
    }, [location.pathname]);

    return null;
}

// ─── Root App ────────────────────────────────────────────────────────────────

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

// ─── App Content ─────────────────────────────────────────────────────────────

function AppContent() {
    const location = useLocation();
    const navigate = useNavigate();

    const [properties, setProperties]           = useState([]);
    const [isSearching, setIsSearching]          = useState(false);
    const [isAuthenticated, setIsAuthenticated]  = useState(
        () => Boolean(localStorage.getItem("token"))
    );

    const isAgentAdmin     = location.pathname.startsWith("/agent-admin");
    const shouldHideFooter = HIDE_FOOTER_ROUTES.has(location.pathname);

    // ─── Data Loading ────────────────────────────────────────────────────────

    const loadProperties = useCallback(async (query = "") => {
        try {
            const params = new URLSearchParams({ page: 0, size: 50 });
            if (query) params.set("q", query);
            const res  = await fetch(`${BASE_URL}/api/properties?${params}`);
            const data = await res.json();
            setProperties(data?.content ?? []);
        } catch (err) {
            console.error("Failed to fetch properties:", err);
            setProperties([]);
        }
    }, []);

    useEffect(() => {
        if (!isAgentAdmin) loadProperties();
    }, [loadProperties, isAgentAdmin]);

    // ─── Search Handler ──────────────────────────────────────────────────────

    const handleSearch = useCallback((data) => {
        if (data === null) {
            setIsSearching(false);
            loadProperties();
            return;
        }
        setIsSearching(true);
        loadProperties(data);
    }, [loadProperties]);

    // ─── Auth Handlers ───────────────────────────────────────────────────────

    const handleLogout = useCallback(() => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        navigate("/");
    }, [navigate]);

    const handleAuthSuccess = useCallback(() => {
        setIsAuthenticated(true);
    }, []);

    // ─── Agent admin renders standalone (no header/footer) ───────────────────

    if (isAgentAdmin) {
        return (
            <>
                <MetaPixelTracker />
                <AgentAdminApp />
            </>
        );
    }

    // ─── Main App ────────────────────────────────────────────────────────────

    return (
        <>
            <MetaPixelTracker />

            <div className="app-container">
                <Header
                    onSearch={handleSearch}
                    isAuthenticated={isAuthenticated}
                    onLogout={handleLogout}
                />

                <Routes>
                    <Route
                        path="/"
                        element={
                            <HomePage
                                properties={properties}
                                isSearching={isSearching}
                                onSearch={handleSearch}
                            />
                        }
                    />
                    <Route path="/property/:slug" element={<PropertyDetails />} />
                    <Route path="/book/:slug"     element={<BookTourPage />} />
                    <Route path="/about"          element={<About />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/contact"        element={<Contact />} />
                    <Route path="/ai-search"      element={<AiSearchPage />} />
                    <Route
                        path="/auth"
                        element={<AuthContainer onAuthSuccess={handleAuthSuccess} />}
                    />
                </Routes>

                <FloatingWhatsapp />
                {!shouldHideFooter && <Footer />}
            </div>
        </>
    );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ onSearch, isAuthenticated, onLogout }) {
    const navigate = useNavigate();

    const handleLogoClick = useCallback(() => {
        onSearch?.(null);
        navigate("/", { replace: true });
    }, [onSearch, navigate]);

    return (
        <header className="topbar">
            <div
                className="header-left header-content"
                onClick={handleLogoClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleLogoClick()}
                aria-label="Go to homepage"
                style={{ cursor: "pointer" }}
            >
                <img src="/logo.png" alt="OGM Logo" className="logo-img" />
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

// ─── Home Page ───────────────────────────────────────────────────────────────

function HomePage({ properties, isSearching, onSearch }) {
    return (
        <main className="main-section">
            <SearchBarContainer onSearch={onSearch} />

            <h2 className="section-title">
                <span className="section-title-text">
                    {isSearching ? "Search Results" : "Popular Homes in Bengaluru"}
                </span>
            </h2>

            <PropertyList properties={properties} />
        </main>
    );
}

// ─── Property List ───────────────────────────────────────────────────────────

function PropertyList({ properties }) {
    if (!properties?.length) {
        return (
            <div className="no-results-container">
                <div className="no-results-content">
                    <div className="no-results-icon">🏠</div>
                    <h3>No properties found</h3>
                    <p>We couldn't find any listings matching your criteria. Try adjusting your search.</p>
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
        <div className="property-grid">
            {properties.map((prop) => (
                <PropertyCard key={prop.id} property={prop} />
            ))}
        </div>
    );
}

export default App;