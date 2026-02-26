export default function CompareBar({ count, onClick }) {
  return (
    <div className="compare-bar">
      {count} selected
      <button onClick={onClick}>Compare</button>
    </div>
  );
}