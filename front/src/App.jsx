import React, { useEffect, useMemo, useState } from "react";
import ResultsByFile from "./components/ResultsByFile";

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function App() {
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bonjour")
      .then((r) => r.text())
      .then(console.log)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setHits([]);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setHits(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  return (
    <div
      style={{
        maxWidth: 760,
        margin: "40px auto",
        padding: "0 16px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Recherche de documents
      </h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tapez votre requête…"
        className="search-input"
        style={{
          width: "100%",
          padding: "12px 14px",
          fontSize: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          outline: "none",
        }}
      />

      {loading && (
        <div style={{ marginTop: 10, fontSize: 14, color: "#666" }}>
          Recherche…
        </div>
      )}
      {error && (
        <div style={{ marginTop: 10, fontSize: 14, color: "#c00" }}>
          Erreur: {error}
        </div>
      )}

      {debouncedQ.trim() && !loading && !error && (
        <div>
          <ResultsByFile hits={hits} />
        </div>
      )}
    </div>
  );
}
