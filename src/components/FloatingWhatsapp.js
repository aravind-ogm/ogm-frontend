import React from "react";
import whatsappLogo from "../assets/whatsapp.png";

export default function FloatingWhatsapp() {
  const whatsappNumber = "919494808825"; // <-- your WhatsApp number here

  return (
    <a
      href={`https:wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
      }}
    >
      <img
        src={whatsappLogo}
        alt="WhatsApp"
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
          cursor: "pointer",
        }}
      />
    </a>
  );
}
