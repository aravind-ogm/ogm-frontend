import React from "react";
import {
  CheckCircle,
  ShieldCheck,
  Car,
  Dumbbell,
  Waves,
  Leaf,
  Sun,
  Home,
  Wind,
  Users,
  Lock,
  Wifi,
} from "lucide-react";

import "../styles/Amenities.css";

// Use only icons that exist in lucide-react
const ICONS = {
  "3-Phase Power Backup": ShieldCheck,
  "24x7 Water Supply": Sun,
  "Gated Community Security": Lock,
  "Covered Car Parking": Car,
  "Clubhouse & Gym": Dumbbell,
  "Swimming Pool": Waves,
  "Landscaped Garden": Leaf,
  "Children Play Area": Users,
  "High-Speed Internet Ready": Wifi,
  "Solar Water Heater": Sun,
  "Modular Kitchen": Home,
  "Vitrified Tile Flooring": CheckCircle,
};

export default function Amenities({ amenities }) {
  if (!amenities || amenities.length === 0) return null;

  return (
    <div className="amenities-grid">
      {amenities.map((item, index) => {
        const Icon = ICONS[item] || CheckCircle;
        return (
          <div key={index} className="amenity-item">
            <Icon className="amenity-icon" />
            <span>{item}</span>
          </div>
        );
      })}
    </div>
  );
}
