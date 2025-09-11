import React, { useEffect, useState, useRef } from "react";
import ResultsByFile from "./components/ResultsByFile";
import PdfJsViewer from "./components/PdfJsViewer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { Client } from "@stomp/stompjs";

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
  const sessionId = "user123";

  // 🔹 STOMP stable en dehors du composant
  const stompClient = useRef(null);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (!stompClient.current) {
      const client = new Client({
        brokerURL: "ws://localhost:8080/ws",
        reconnectDelay: 5000,
        //debug: (str) => console.log("[STOMP]", str),
      });

      client.onConnect = () => {
        console.log("STOMP connecté");

        // Subscription une seule fois
        if (!subscriptionRef.current) {
          subscriptionRef.current = client.subscribe(
              `/queue/results-${sessionId}`,
              (message) => {
                try {
                  if (message.body === "COMPLETED") {
                    console.log("Recherche terminée");
                    setLoading(false);
                    return;
                  }

                  const data = JSON.parse(message.body);
                  console.log("Nouveau hit reçu:", data);
                  setHits((prev) => [...prev, data]);
                } catch (e) {
                  console.error("Erreur parsing message:", e, message.body);
                }
              }
          );
        }
      };

      client.activate();
      stompClient.current = client;
    }

    // on ne déconnecte jamais automatiquement
  }, []);

  // 🔹 Lancer la recherche quand la query change
  useEffect(() => {
    if (!debouncedQ.trim()) {
      setHits([]);
      setSelectedUrl("");
      return;
    }

    setHits([]);
    setLoading(true);
    setError("");

    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: "/app/startSearch",
        body: JSON.stringify({ query: debouncedQ, sessionId }),
      });
    } else {
      console.error("STOMP non connecté");
      setError("Impossible de se connecter au serveur WebSocket");
      setLoading(false);
    }
  }, [debouncedQ]);

  // 🔹 Affichage PDF uniquement sur clic
  const handleSelectUrl = (url) => setSelectedUrl(url);

  return (
      <div style={{ height: "100vh", display: "grid", gridTemplateRows: "auto 1fr" }}>
        {/* Zone de recherche */}
        <div style={{ margin: "0 0", width: "50%", left: 0, padding: "16px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Rechercher dans les documents
          </h1>
          <div style={{ position: "relative", width: "100%" }}>
            <FontAwesomeIcon
                icon={faSearch}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#888",
                  pointerEvents: "none",
                }}
            />
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tapez votre requête…"
                className="search-input"
            />
            {loading && (
                <div style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
                  Recherche en cours...
                </div>
            )}
            {error && (
                <div style={{ marginTop: 8, fontSize: 14, color: "#c00" }}>
                  Erreur: {error}
                </div>
            )}
          </div>
        </div>

        {/* Résultats et PDF */}
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
            <ResultsByFile hits={hits} query={debouncedQ} onSelectUrl={handleSelectUrl} />
          </div>

          <PdfJsViewer src={selectedUrl} />
        </div>
      </div>
  );
}
