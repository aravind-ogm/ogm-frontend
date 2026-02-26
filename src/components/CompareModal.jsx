export default function CompareModal({ properties, onClose }) {
  return (
    <div className="compare-modal">
      <button onClick={onClose}>Close</button>
      <div className="compare-grid">
        {properties.map((p) => (
          <div key={p.id}>
            <h4>{p.title}</h4>
            <p>{p.location}</p>
            <p>₹ {p.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}