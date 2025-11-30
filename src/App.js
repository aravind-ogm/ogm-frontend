import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

import PropertyCard from "./components/PropertyCard";
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import Contact from "./pages/Contact";
import PropertyDetails from "./pages/PropertyDetails";
import Footer from "./components/Footer";
import About from "./pages/About";



import "./styles/App.css";

function App() {
  const [properties, setProperties] = useState([]);

  // --------------------------- Load Properties --------------------------- //
  const loadProperties = async (query = "") => {
    try {
      const url = query
        ? `http://localhost:8080/api/properties?q=${encodeURIComponent(query)}`
        : `http://localhost:8080/api/properties`;
//const BASE_URL = process.env.REACT_APP_API_URL;
//
//const url = query
//  ? `${BASE_URL}/api/properties?q=${encodeURIComponent(query)}`
//  : `${BASE_URL}/api/properties`;


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
        <Header />

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



// --------------------------- SIMPLE SEARCH BAR (Functional) --------------------------- //
function SearchBar({ onSearch }) {
  const [text, setText] = useState("");

  const handleSearch = () => {
    onSearch(text);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="search-wrap">
      <div className="search-input">
        <input
          placeholder="Find Apartments, Villas, Plots in Bengaluru"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
        />

        <button className="search-btn" onClick={handleSearch}>
          {/* Subtle clean icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#475569"
            strokeWidth="2"
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
