// BrokerSuccessScreen.jsx — shown after successful broker registration

import React, { useEffect, useState } from "react";
import "./BrokerRegistration.css";

/**
 * BrokerSuccessScreen
 * Props:
 *   brokerName   — registered broker's name
 *   brokerId     — assigned broker ID from backend
 *   onReset      — fn() to go back and register another
 */
const BrokerSuccessScreen = ({ brokerName, brokerId, onReset }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className={`broker-success${visible ? " broker-success--visible" : ""}`}>
            <div className="broker-success__circle">
                <svg viewBox="0 0 80 80" className="broker-success__svg">
                    <circle cx="40" cy="40" r="38" className="broker-success__ring" />
                    <polyline
                        points="22,42 34,54 58,28"
                        className="broker-success__check"
                    />
                </svg>
            </div>

            <h2 className="broker-success__title">Registration Successful!</h2>

            <p className="broker-success__message">
                Welcome to the platform, <strong>{brokerName}</strong>!<br />
                Our team will review your profile and get in touch shortly.
            </p>

            {brokerId && (
                <div className="broker-success__id-box">
                    <span className="broker-success__id-label">Your Broker ID</span>
                    <span className="broker-success__id-value">{brokerId}</span>
                    <button
                        className="broker-success__copy-btn"
                        onClick={() => navigator.clipboard?.writeText(brokerId)}
                        title="Copy to clipboard"
                    >
                        📋
                    </button>
                </div>
            )}

            <div className="broker-success__steps">
                <div className="broker-success__step">
                    <span className="broker-success__step-icon">📧</span>
                    <p>Check your email for a confirmation link</p>
                </div>
                <div className="broker-success__step">
                    <span className="broker-success__step-icon">📞</span>
                    <p>Our team will call you within 24 hours</p>
                </div>
                <div className="broker-success__step">
                    <span className="broker-success__step-icon">🏠</span>
                    <p>Start listing properties once verified</p>
                </div>
            </div>

            <button className="broker-success__reset-btn" onClick={onReset}>
                Register Another Broker
            </button>
        </div>
    );
};

export default BrokerSuccessScreen;