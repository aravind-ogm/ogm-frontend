// BrokerFormField.jsx — reusable labeled input row with icon and error display

import React from "react";
import "./BrokerRegistration.css";

/**
 * BrokerFormField
 * Props:
 *   icon        — emoji or SVG element shown on the left
 *   label       — string or JSX label text
 *   error       — error string (shown in red below)
 *   children    — the actual input/select/custom control
 *   required    — boolean, shows asterisk
 */
const BrokerFormField = ({ icon, label, error, children, required = false }) => {
    return (
        <div className={`broker-field${error ? " broker-field--error" : ""}`}>
            <div className="broker-field__inner">
                <div className="broker-field__label-row">
                    {icon && <span className="broker-field__icon">{icon}</span>}
                    <label className="broker-field__label">
                        {label}
                        {required && <span className="broker-field__required">*</span>}
                    </label>
                </div>
                <div className="broker-field__control">{children}</div>
            </div>
            {error && (
                <p className="broker-field__error">
                    <span className="broker-field__error-icon">⚠</span> {error}
                </p>
            )}
        </div>
    );
};

export default BrokerFormField;