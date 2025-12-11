import React, { useState } from "react";

const CATEGORY_OPTIONS = [
  "Restaurant",
  "Metro",
  "Mall",
  "Hospital",
  "School",
  "Airport",
  "Gym",
  "Bus Stop",
  "Park"
];

export default function NearbyManager({ nearby, setNearby }) {
  const [item, setItem] = useState({
    name: "",
    distance: "",
    category: "",
    image: ""
  });

  const handleChange = (e) => {
    setItem({ ...item, [e.target.name]: e.target.value });
  };

  const addNearby = () => {
    if (!item.name || !item.distance || !item.category || !item.image) {
      alert("All fields required.");
      return;
    }
    setNearby([...nearby, item]);
    setItem({ name: "", distance: "", category: "", image: "" });
  };

  const removeNearby = (index) => {
    const updated = [...nearby];
    updated.splice(index, 1);
    setNearby(updated);
  };

  return (
    <div className="nearby-admin-box">
      <h3 className="admin-section-title">Nearby Highlights</h3>

      {/* INPUT GRID */}
      <div className="admin-grid">
        <input
          name="name"
          value={item.name}
          onChange={handleChange}
          className="admin-input"
          placeholder="Place name (Ex: Phoenix Mall)"
        />

        <input
          name="distance"
          value={item.distance}
          onChange={handleChange}
          className="admin-input"
          placeholder="Distance (Ex: 2.3 km)"
        />

        <select
          name="category"
          value={item.category}
          onChange={handleChange}
          className="admin-input"
        >
          <option value="">Select category</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          name="image"
          value={item.image}
          onChange={handleChange}
          className="admin-input"
          placeholder="Image URL"
        />
      </div>

      {/* ADD BUTTON */}
      <button className="admin-add-btn" onClick={addNearby}>
        + Add Nearby Place
      </button>

      {/* LIST TABLE */}
      <div className="nearby-list">
        {nearby.map((loc, i) => (
          <div key={i} className="nearby-row">
            <img src={loc.image} className="nearby-thumb" alt="" />
            <div className="nearby-info">
              <b>{loc.name}</b>
              <span>{loc.distance}</span>
              <span className="chip">{loc.category}</span>
            </div>
            <button className="remove-btn" onClick={() => removeNearby(i)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
