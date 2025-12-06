import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import PropertyCard from "./components/PropertyCard";
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import Contact from "./pages/Contact";
import PropertyDetails from "./pages/PropertyDetails";
import Footer from "./components/Footer";
import About from "./pages/About";
import AIChatWidget from "./components/AIChatWidget";

import "./styles/App.css";

function App() {
  const [properties, setProperties] = useState([]);

  // --------------------------- Load Properties --------------------------- //
  const loadProperties = async (query = "") => {
    try {
      const url = query
        ? `http://localhost:8080/api/properties?q=${encodeURIComponent(query)}`
        : `http://localhost:8080/api/properties`;

      const res = await fetch(url);
      const data = await res.json();
      setProperties(data.content || []);
    } catch (err) {
      console.error("Failed to fetch properties", err);
      setProperties([]);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  return (
    <Router>
      <div className="app-container">

        {/* HEADER */}
        <Header />

        {/* ROUTES */}
        <Routes>
          {/* HOME PAGE */}
          <Route
            path="/"
            element={
              <main className="main-section">
                <SearchBar onSearch={(q) => loadProperties(q)} />
                <h2 className="section-title">Popular Homes in Bengaluru</h2>
                <PropertyList properties={properties} />
              </main>
            }
          />

          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>

        {/* ✅ AI CHAT WIDGET OUTSIDE ROUTES
            ↓↓↓ This FIXES your crash */}
        <AIChatWidget />

        <FloatingWhatsapp />
        <Footer />
      </div>
    </Router>
  );
}

export default App;

// --------------------------- Header --------------------------- //
function Header() {
  return (
    <header className="topbar">
      <div className="header-left">
        <Link to="/" className="header-content">
          <img
            src="/logo.png"
            alt="OGM Logo"
            className="logo-img"
            style={{ height: "50px", cursor: "pointer" }}
          />
          <h1 className="header-title">One Global Marketplace</h1>
        </Link>
      </div>

      <div className="header-actions">
        <Link to="/contact" className="contact">
          Contact Us
        </Link>
      </div>
    </header>
  );
}

// --------------------------- SIMPLE SEARCH BAR --------------------------- //
function SearchBar({ onSearch }) {
  const [text, setText] = useState("");

  const handleSearch = () => onSearch(text);
  const handleAskAI = () => {
    window.dispatchEvent(new Event("open-ai-widget"));
  };

  return (
    <div className="search-wrap">
      <div className="search-bar-outer">

        {/* LEFT — Search Section */}
        <div className="segment left-segment">
          <label className="segment-title">Search</label>
          <input
            className="segment-input"
            placeholder="Find Apartments, Villas, Plots..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* Divider */}
        <div className="divider"></div>

        {/* RIGHT — AI Section */}
        <div className="segment ai-segment" onClick={handleAskAI}>
          <label className="segment-title">Ask AI Agent</label>
          <span className="segment-sub">Let AI help you search</span>
        </div>

        {/* SEARCH ICON BUTTON */}
        <button className="end-search-btn" onClick={handleSearch}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>
    </div>
  );
}




// --------------------------- Property List --------------------------- //
function PropertyList({ properties }) {
  if (!properties || properties.length === 0) {
    return <p style={{ marginTop: "20px" }}>No properties found.</p>;
  }

  return (
    <div className="property-grid">
      {properties.map((prop) => (
        <PropertyCard key={prop.id} property={prop} />
      ))}
    </div>
  );
}
