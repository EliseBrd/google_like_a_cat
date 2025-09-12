import React, { useEffect, useState, useRef } from "react";
import ResultsByFile from "./components/ResultsByFile";
import PdfJsViewer from "./components/PdfJsViewer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { Client } from "@stomp/stompjs";
import { supabase } from "./supabaseClient";
import Navbar from "./components/Navbar";

export default function App() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const user = session?.user ?? null;
  const pseudo =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    user?.id ||
    "Anonyme";
  const sessionId = user?.id || "user123";

  const [q, setQ] = useState("");                
  const [searchQuery, setSearchQuery] = useState("");
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const [elapsedTime, setElapsedTime] = useState(null);

  const stompClient = useRef(null);
  const startedAt = useRef(null);       
  const firstResultMs = useRef(null);    
  const resultsCountRef = useRef(0);     

  useEffect(() => {
    if (!user) return;

    const client = new Client({
      brokerURL: "ws://localhost:8080/ws",
      reconnectDelay: 5000,
      debug: (s) => console.log(s),
    });

    client.onConnect = () => {
      console.log("STOMP connecté");
      client.subscribe(`/queue/results-${sessionId}`, async (message) => {
        try {
          if (message.body === "COMPLETED") {
            setLoading(false);
            const ms_total = startedAt.current ? performance.now() - startedAt.current : null;

            if (user && searchQuery.trim()) {
              supabase
                .from("search_history")
                .insert({
                  user_id: user.id,
                  session_id: sessionId,
                  query: searchQuery,
                  status: "completed",
                  result_count: resultsCountRef.current,
                  ms_first_result: firstResultMs.current ?? null,
                  ms_total: ms_total ?? null,
                })
                .then(({ error }) => {
                  if (error) console.error("Insert history error:", error);
                });
            }

            startedAt.current = null;
            firstResultMs.current = null;
            resultsCountRef.current = 0;
            return;
          }

          if (message.body?.startsWith("ERROR:")) {
            const errMsg = message.body.slice("ERROR: ".length);
            setError(errMsg);
            setLoading(false);
            const ms_total = startedAt.current ? performance.now() - startedAt.current : null;

            if (user && searchQuery.trim()) {
              supabase
                .from("search_history")
                .insert({
                  user_id: user.id,
                  session_id: sessionId,
                  query: searchQuery,
                  status: "error",
                  result_count: resultsCountRef.current,
                  ms_first_result: firstResultMs.current ?? null,
                  ms_total: ms_total ?? null,
                  error: errMsg,
                })
                .then(({ error }) => {
                  if (error) console.error("Insert history error:", error);
                });
            }

            startedAt.current = null;
            firstResultMs.current = null;
            resultsCountRef.current = 0;
            return;
          }

          const data = JSON.parse(message.body);

          if (firstResultMs.current == null && startedAt.current) {
            const elapsed = performance.now() - startedAt.current;
            firstResultMs.current = elapsed;
            setElapsedTime(elapsed.toFixed(2));
          }

          resultsCountRef.current += 1;
          setHits((prev) => [...prev, data]);
        } catch (e) {
          console.error("Erreur parsing message:", e, message.body);
        }
      });

        const warmupSessionId = `${sessionId}-warmup-${Date.now()}`;
        stompClient.current.publish({
            destination: "/app/startSearch",
            body: JSON.stringify({
                query: "warmup",
                sessionId: warmupSessionId,
                user: "warmup"
            }),
        });
    };

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [user, sessionId, searchQuery]);

  const startSearch = (query) => {
    const qTrim = (query || "").trim();
    if (!qTrim) return;

    setSearchQuery(qTrim);
    setHits([]);
    setSelectedUrl("");
    setError("");
    setElapsedTime(null);
    resultsCountRef.current = 0;
    firstResultMs.current = null;
    startedAt.current = performance.now();
    setLoading(true);

    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: "/app/startSearch",
        body: JSON.stringify({ query: qTrim, sessionId, user: pseudo }),
      });
    } else {
      setError("Impossible de se connecter au serveur WebSocket");
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startSearch(q);
    }
  };

  useEffect(() => {
    if (hits?.length) {
      const firstWithUrl = hits.find((h) => h.url);
      if (firstWithUrl) setSelectedUrl(firstWithUrl.url);
    } else {
      setSelectedUrl("");
    }
  }, [hits]);

  if (!user) return null;

  return (
    <>
      <Navbar user={user} />
      <div
        style={{
          height: "fit-content",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        
        <div
          style={{
            margin: "0 0",
            width: "50%",
            left: 0,
            padding: "16px",
            height: "fit-content",
          }}
        >
          <div style={{ position: "relative", width: "100%", display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
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
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre requête…"
                className="search-input"
                style={{ width: "100%", paddingLeft: 36 }}
              />
            </div>
          </div>

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
          {elapsedTime && (
            <div style={{ marginTop: 8, fontSize: 14, color: "#0a0" }}>
              Premier résultat reçu en {elapsedTime} ms
            </div>
          )}
        </div>

        {/* Résultats + Viewer */}
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
            <ResultsByFile
              hits={hits}
              query={searchQuery}
              onSelectUrl={(url) => setSelectedUrl(url)}
            />
          </div>

          <PdfJsViewer src={selectedUrl} query={searchQuery} />
        </div>
      </div>
    </>
  );
}
