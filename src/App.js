import React, {useEffect, useState} from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
    useNavigate,
} from "react-router-dom";

import PropertyCard from "./components/PropertyCard";
import AIResultCard from "./components/property/AIResultCard";
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import Contact from "./pages/Contact";
import PropertyDetails from "./pages/PropertyDetails";
import Footer from "./components/Footer";
import About from "./pages/About";
import SearchBar from "./search/SearchBar";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import "./styles/App.css";
import AuthContainer from "./components/ogm-auth/AuthContainer";

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

    const [isAuthenticated, setIsAuthenticated] = useState(
        Boolean(localStorage.getItem("token"))
    );

    const baseUrl = "http://localhost:8080";

    /* ================= LOAD PROPERTIES ================= */
    const loadProperties = async (query = "") => {
        try {
            const url = query
                ? `${baseUrl}/api/properties?q=${encodeURIComponent(query)}&page=0&size=50`
                : `${baseUrl}/api/properties?page=0&size=50`;

            const res = await fetch(url);
            const data = await res.json();
            setProperties(data?.content || []);
        } catch {
            setProperties([]);
        }
    };

    /* ================= SEARCH ================= */
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
    }, []);

    return (
        <Router>
            <MetaPixelTracker/>

            <div className="app-container">
                <Header
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
                                {searchMode !== "ai" && (
                                    <SearchBar onSearch={handleSearch}/>
                                )}

                                <h2 className="section-title">
                                    Popular Homes in Bengaluru
                                </h2>

                                <PropertyList
                                    properties={properties}
                                    searchMode={searchMode}
                                />
                            </main>
                        }
                    />

                    <Route path="/property/:slug" element={<PropertyDetails/>}/>
                    <Route path="/about" element={<About/>}/>
                    <Route path="/privacy-policy" element={<PrivacyPolicy/>}/>
                    <Route path="/contact" element={<Contact/>}/>

                    {/* 🔐 AUTH */}
                    <Route
                        path="/auth"
                        element={
                            <AuthContainer
                                onAuthSuccess={() => setIsAuthenticated(true)}
                            />
                        }
                    />
                </Routes>

                <FloatingWhatsapp/>
                <Footer/>
            </div>
        </Router>
    );
}

/* ================= HEADER ================= */
function Header({isAuthenticated, onLogout}) {
    const navigate = useNavigate();

    return (
        <header className="topbar">
            <div
                className="header-left header-content"
                onClick={() => navigate("/")}
                style={{cursor: "pointer"}}
            >
                <img src="/logo.png" alt="OGM Logo" className="logo-img"/>
                <h1 className="header-title">One Global Marketplace</h1>
            </div>

            <div className="header-actions">
                {isAuthenticated ? (
                    <button className="contact" onClick={onLogout}>
                        Logout
                    </button>
                ) : (
                    <>
                        <button
                            className="contact secondary"
                            onClick={() => navigate("/auth")}
                        >
                            Login
                        </button>

                        <button
                            className="contact"
                            onClick={() => navigate("/auth?view=signup")}
                        >
                            Sign Up
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}

/* ================= PROPERTY LIST ================= */
function PropertyList({properties}) {
    if (!properties || properties.length === 0) {
        return <p>No properties found.</p>;
    }

    return (
        <div className="property-grid">
            {properties.map((prop) => (
                <PropertyCard key={prop.id} property={prop}/>
            ))}
        </div>
    );
}

export default App;
