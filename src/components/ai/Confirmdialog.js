import React, { useEffect } from "react";
import "../../styles/ai/ai-confirm.css";

/**
 * ConfirmDialog – modal confirmation with keyboard support
 */
export default function ConfirmDialog({
  title = "Are you sure?",
  message = "",
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onConfirm, onCancel]);

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="confirm-btns">
          <button onClick={onCancel}>Cancel</button>
          <button className="confirm-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}