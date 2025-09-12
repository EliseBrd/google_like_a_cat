import React, { useEffect, useState, useRef } from "react";
import ResultsByFile from "./components/ResultsByFile";
import PdfJsViewer from "./components/PdfJsViewer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { Client } from "@stomp/stompjs";
import { supabase } from "./supabaseClient";
import Navbar from "./components/Navbar";

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function App() {
  const [session, setSession] = useState(null);
  const firstResultMs = useRef(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const pseudo =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    user?.id ||
    "Anonyme";

  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const stompClient = useRef(null);
  const sessionId = user?.id || "user123";

  const searchStartTime = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(null);

  useEffect(() => {
    if (!user) return;
    stompClient.current = new Client({
      brokerURL: "ws://localhost:8080/ws",
      reconnectDelay: 5000,
    });

    stompClient.current.onConnect = () => {
      console.log("STOMP connecté");
      stompClient.current.subscribe(
        `/queue/results-${sessionId}`,
        async (message) => {
          try {
            if (message.body === "COMPLETED") {
              console.log("Recherche terminée");
              setLoading(false);

              const ms_total = searchStartTime.current
                ? performance.now() - searchStartTime.current
                : null;

              try {
                await supabase.from("search_history").insert({
                  user_id: user.id,
                  session_id: sessionId,
                  query: debouncedQ,
                  status: "completed",
                  result_count: hits.length,
                  ms_first_result: firstResultMs.current ?? null,
                  ms_total: ms_total ?? null,
                });
              } catch (e) {
                console.error("Insert history error:", e);
              }

              firstResultMs.current = null;
              return;
            }

            // ❌ Erreur côté serveur
            if (message.body?.startsWith("ERROR:")) {
              const errMsg = message.body.slice("ERROR: ".length);
              setError(errMsg);
              setLoading(false);

              const ms_total = searchStartTime.current
                ? performance.now() - searchStartTime.current
                : null;

              try {
                await supabase.from("search_history").insert({
                  user_id: user.id,
                  session_id: sessionId,
                  query: debouncedQ,
                  status: "error",
                  result_count: hits.length,
                  ms_first_result: firstResultMs.current ?? null,
                  ms_total: ms_total ?? null,
                  error: errMsg,
                });
              } catch (e) {
                console.error("Insert history error:", e);
              }

              firstResultMs.current = null;
              return;
            }

            // 📄 Résultat normal
            const data = JSON.parse(message.body);

            if (searchStartTime.current) {
              const elapsed = performance.now() - searchStartTime.current;
              setElapsedTime(elapsed.toFixed(2)); // UI
              firstResultMs.current = elapsed; // --- HISTO ---
              searchStartTime.current = null; // reset après 1er résultat
            }

            setHits((prev) => [...prev, data]);
          } catch (e) {
            console.error("Erreur parsing message:", e, message.body);
          }
        }
      );
    };

    stompClient.current.activate();

    return () => {
      if (stompClient.current) stompClient.current.deactivate();
    };
  }, [user, sessionId]);

  useEffect(() => {
    if (!user) return;
    if (!debouncedQ.trim()) {
      setHits([]);
      setSelectedUrl("");
      setLoading(false);
      setElapsedTime(null);
      return;
    }
    setHits([]);
    setLoading(true);
    setError("");
    setElapsedTime(null);

    if (stompClient.current?.connected) {
      searchStartTime.current = performance.now();
      stompClient.current.publish({
        destination: "/app/startSearch",
        body: JSON.stringify({ query: debouncedQ, sessionId, user: pseudo }),
      });
    } else {
      console.error("STOMP non connecté");
      setError("Impossible de se connecter au serveur WebSocket");
      setLoading(false);
    }
  }, [debouncedQ, user, sessionId]);

  useEffect(() => {
    if (hits?.length) {
      const firstWithUrl = hits.find((h) => h.url);
      if (firstWithUrl) setSelectedUrl(firstWithUrl.url);
    } else {
      setSelectedUrl("");
    }
  }, [hits]);

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
              query={debouncedQ}
              onSelectUrl={(url) => setSelectedUrl(url)}
            />
          </div>

          <PdfJsViewer src={selectedUrl} query={debouncedQ} />
        </div>
      </div>
    </>
  );
}
