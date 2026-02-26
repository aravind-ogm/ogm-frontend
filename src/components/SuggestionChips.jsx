export default function SuggestionChips({ setInput }) {
  return (
    <div className="chips">
      <button onClick={() => setInput("2 bhk in whitefield")}>
        2 BHK Whitefield
      </button>
      <button onClick={() => setInput("villa under 1 crore")}>
        Villa under 1 Cr
      </button>
      <button onClick={() => setInput("3 bhk near metro")}>
        3 BHK near metro
      </button>
    </div>
  );
}