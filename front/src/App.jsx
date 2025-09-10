import React, { useEffect, useState } from "react";
import ResultsByFile from "./components/ResultsByFile";
import PdfJsViewer from "./components/PdfJsViewer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

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
  const [selectedUrl, setSelectedUrl] = useState("");

  useEffect(() => {
    fetch("/api/bonjour").then((r) => r.text()).then(console.log).catch(console.error);
  }, []);

  useEffect(() => {
    if (!debouncedQ.trim()) {
      setHits([]);
      setSelectedUrl("");
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

  useEffect(() => {
    if (hits?.length) {
      const firstWithUrl = hits.find(h => h.url);
      if (firstWithUrl) setSelectedUrl(firstWithUrl.url);
    } else {
      setSelectedUrl("");
    }
  }, [hits]);

  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
      <div style={{ margin: "0 0", width: "50%", left: 0, padding: "16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Rechercher dans les documents</h1>

        <div style={{ position: "relative", width: "100%" }}>
          <FontAwesomeIcon
            icon={faSearch}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#888", pointerEvents: "none" }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tapez votre requête…"
            className="search-input"
          />
          {loading && <div style={{ marginTop: 8, fontSize: 14, color: "#666" }}>Recherche…</div>}
          {error && <div style={{ marginTop: 8, fontSize: 14, color: "#c00" }}>Erreur: {error}</div>}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(450px, 650px) 1fr",
          gap: 12,
          height: "100%",
          width: "100%",
          margin: "0 auto",
          padding: "0 16px 16px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ overflow: "auto", paddingRight: 4 }}>
          {debouncedQ.trim() && !loading && !error ? (
            <ResultsByFile
              hits={hits}
              query={debouncedQ}
              onSelectUrl={(url) => setSelectedUrl(url)}
            />
          ) : (
            <div style={{ color: "#666", fontSize: 14 }}>Tape une requête pour commencer.</div>
          )}
        </div>

        <PdfJsViewer src={selectedUrl} query={debouncedQ} />
      </div>
    </div>
  );
}
