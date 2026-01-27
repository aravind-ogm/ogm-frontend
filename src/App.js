import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { fetchProperties } from "./api/propertyApi";

import Header from "./components/common/Header";
import FloatingWhatsapp from "./components/FloatingWhatsapp";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import PropertyDetails from "./pages/PropertyDetails";
import About from "./pages/About";
import Contact from "./pages/Contact";
import AuthContainer from "./components/ogm-auth/AuthContainer";

import "./styles/app.css";

function App() {
  const [properties, setProperties] = useState([]);
  const [searchMode, setSearchMode] = useState("default");
  const [wishlist, setWishlist] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  /* ================= NORMAL SEARCH ================= */

  const loadProperties = async (query = "") => {
    try {
      const data = await fetchProperties({ query });
      setProperties(data?.content || []);
    } catch (err) {
      console.error("Failed to fetch properties", err);
      setProperties([]);
    }
  };

  /* ================= UNIFIED SEARCH ================= */

  const handleSearch = (data) => {
    if (Array.isArray(data)) {
      setProperties(data);
      setSearchMode("ai");
      return;
    }

    setSearchMode("normal");
    loadProperties(data);
  };

  const handleWishlist = (property) => {
    setWishlist((prev) =>
        prev.some((p) => p.id === property.id)
            ? prev
            : [...prev, property]
    );
  };

  const handleWatchlist = (property) => {
    setWatchlist((prev) =>
        prev.some((p) => p.id === property.id)
            ? prev
            : [...prev, property]
    );
  };

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    loadProperties();
    setSearchMode("default");
  }, []);

  return (
      <Router>
        <div className="app-container">
          <Header />

          <Routes>
            <Route
                path="/"
                element={
                  <Home
                      properties={properties}
                      searchMode={searchMode}
                      onSearch={handleSearch}
                      onWishlist={handleWishlist}
                      onWatchlist={handleWatchlist}
                  />
                }
            />

            <Route path="/property/:id" element={<PropertyDetails />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<AuthContainer />} />
          </Routes>

          <FloatingWhatsapp />
          <Footer />
        </div>
      </Router>
  );
}

export default App;
