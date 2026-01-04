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
import SearchBar from "./search/SearchBar";

function App() {
  const [properties, setProperties] = useState([]);
  const loadProperties = async (query = "") => {
    try {
      const baseUrl = "https://ogm-backend-clean.onrender.com";
      const url = query
        ? `${baseUrl}/api/properties?q=${encodeURIComponent(query)}&page=0&size=500`
        : `${baseUrl}/api/properties?page=0&size=500`;

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

        <AIChatWidget />
        <FloatingWhatsapp />
        <Footer />
      </div>
    </Router>
  );
}

export default App;

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
