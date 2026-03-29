// BrokerMultiSelect.jsx — accessible multi-select dropdown with checkboxes

import React, { useState, useRef, useEffect } from "react";
import "./BrokerRegistration.css";

/**
 * BrokerMultiSelect
 * Props:
 *   options       — array of strings or { id, label, icon } objects
 *   selected      — array of selected option IDs/labels
 *   onChange      — fn(newSelectedArray)
 *   placeholder   — string
 *   maxDisplay    — how many tags to show before "+N more"
 */
const BrokerMultiSelect = ({
                               options = [],
                               selected = [],
                               onChange,
                               placeholder = "Select options",
                               maxDisplay = 3,
                           }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Normalize options to { id, label } shape
    const normalized = options.map((o) =>
        typeof o === "string" ? { id: o, label: o } : o
    );

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggle = (id) => {
        const next = selected.includes(id)
            ? selected.filter((s) => s !== id)
            : [...selected, id];
        onChange(next);
    };

    const displayLabels = selected
        .slice(0, maxDisplay)
        .map((id) => normalized.find((o) => o.id === id)?.label || id);

    const extra = selected.length - maxDisplay;

    return (
        <div className="broker-multiselect" ref={ref}>
            <button
                type="button"
                className={`broker-multiselect__trigger${open ? " broker-multiselect__trigger--open" : ""}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
        <span className="broker-multiselect__value">
          {selected.length === 0 ? (
              <span className="broker-multiselect__placeholder">{placeholder}</span>
          ) : (
              <>
                  {displayLabels.join(", ")}
                  {extra > 0 && (
                      <span className="broker-multiselect__extra"> +{extra} more</span>
                  )}
              </>
          )}
        </span>
                <span className={`broker-multiselect__chevron${open ? " broker-multiselect__chevron--up" : ""}`}>
          ▼
        </span>
            </button>

            {open && (
                <div className="broker-multiselect__dropdown" role="listbox" aria-multiselectable="true">
                    {normalized.map((opt) => {
                        const checked = selected.includes(opt.id);
                        return (
                            <label
                                key={opt.id}
                                className={`broker-multiselect__item${checked ? " broker-multiselect__item--checked" : ""}`}
                                role="option"
                                aria-selected={checked}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggle(opt.id)}
                                    className="broker-multiselect__checkbox"
                                />
                                {opt.icon && <span className="broker-multiselect__item-icon">{opt.icon}</span>}
                                <span className="broker-multiselect__item-label">{opt.label}</span>
                                {checked && <span className="broker-multiselect__item-tick">✓</span>}
                            </label>
                        );
                    })}

                    {selected.length > 0 && (
                        <button
                            type="button"
                            className="broker-multiselect__clear"
                            onClick={(e) => { e.stopPropagation(); onChange([]); }}
                        >
                            Clear all
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BrokerMultiSelect;