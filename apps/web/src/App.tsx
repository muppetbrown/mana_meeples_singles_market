import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="p-4 max-w-5xl mx-auto">
      <h1>Mana & Meeples — Singles Market</h1>
      <p>React + TypeScript baseline is up.</p>

      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        aria-live="polite"
      >
        Count: {count}
      </button>
    </main>
  );
}
