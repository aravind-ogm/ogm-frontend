import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="premium-footer" aria-label="Main Footer">
            <div className="footer-container">
                {/* BRAND & SOCIAL SECTION */}
                <div className="footer-brand">
                    <img src="/logo.png" alt="OGM Logo" className="footer-logo" />
                    <p className="footer-brand-text">
                        One Global Marketplace — Connecting buyers and sellers through
                        trusted real estate discovery.
                    </p>

                    <div className="footer-social">
                        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                            <i className="fab fa-facebook"></i>
                        </a>
                        <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                            <i className="fab fa-x-twitter"></i>
                        </a>
                        <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                            <i className="fab fa-youtube"></i>
                        </a>
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                            <i className="fab fa-linkedin"></i>
                        </a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                            <i className="fab fa-instagram"></i>
                        </a>
                    </div>
                </div>

                {/* GLASS NAVIGATION CARD */}
                <nav className="footer-links-card" aria-label="Footer Navigation">
                    <Link to="/about">About Us</Link>
                    <Link to="/terms">Terms & Conditions</Link>
                    <Link to="/privacy-policy">Privacy Policy</Link>
                    <Link to="/support">Customer Support</Link>
                    <Link to="/contact">Contact</Link>
                </nav>

                {/* INFO & COPYRIGHT */}
                <div className="footer-bottom">
                    <p className="footer-disclaimer">
                        OGM acts only as a platform to display real estate listings.
                        All information is provided directly by sellers or developers.
                    </p>
                    <p className="footer-copy">
                        © {currentYear} One Global Marketplace. All Rights Reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}