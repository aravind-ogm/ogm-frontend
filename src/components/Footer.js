import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="premium-footer">

      {/* TOP BRAND AREA */}
      <div className="footer-brand">
        <img src="/logo.png" alt="OGM" className="footer-logo" />

        <p className="footer-brand-text">
          One Global Marketplace — Connecting buyers and sellers through trusted
          real estate discovery.
        </p>

        {/* PREMIUM SOCIAL ICONS WITH LINKS */}
        <div className="footer-social">
          <a href="https://www.facebook.com/profile.php?id=61557363285101" target="_blank" rel="noreferrer">
            <i className="fab fa-facebook"></i>
          </a>

          <a href="https://x.com/worldofogm" target="_blank" rel="noreferrer">
            <i className="fab fa-x-twitter"></i>
          </a>

          <a href="https://youtube.com" target="_blank" rel="noreferrer">
            <i className="fab fa-youtube"></i>
          </a>

          <a href="https://in.linkedin.com/company/one-global-marketplace" target="_blank" rel="noreferrer">
            <i className="fab fa-linkedin"></i>
          </a>

          <a href="https://www.instagram.com/oneglobalmarketplace" target="_blank" rel="noreferrer">
            <i className="fab fa-instagram"></i>
          </a>
        </div>

      </div>

      {/* GLASS LINKS CARD */}
      <div className="footer-links-card">
        <Link to="/about">About Us</Link>
        <a href="#">Terms & Conditions</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Customer Support</a>
        <Link to="/contact">Contact</Link>
      </div>

      {/* DISCLAIMER */}
      <p className="footer-disclaimer">
        OGM acts only as a platform to display real estate listings. All information
        is provided directly by sellers or developers.
      </p>

      <p className="footer-copy">
        © {new Date().getFullYear()} OGM Market. All Rights Reserved.
      </p>
    </footer>
  );
}
