import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import { supabase } from "./supabaseClient";

const WebSocketSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("Déconnecté");

  const searchStartTime = useRef(null);
  const firstResultMs = useRef(null);
  const hasLoggedRef = useRef(false);
  const stompClient = useRef(null);

  const [session, setSession] = useState(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  const user = session?.user ?? null;
  const sessionId = user?.id || "anon";

  useEffect(() => {
    // Création du client STOMP
    stompClient.current = new Client({
      brokerURL: "ws://localhost:8080/ws", // ton endpoint WebSocket
      reconnectDelay: 5000, // reconnexion automatique
      debug: (str) => console.log(str),
    });

    stompClient.current.onConnect = (frame) => {
      console.log("Connecté STOMP :", frame, stompClient.current);
      setStatus("Connecté");

      stompClient.current.subscribe(
        `/queue/results-${sessionId}`,
        async (message) => {
          try {
            const body = JSON.parse(message.body);

            if (
              !firstResultMs.current &&
              body?.status !== "COMPLETED" &&
              body?.status !== "ERROR"
            ) {
              if (searchStartTime.current) {
                firstResultMs.current =
                  performance.now() - searchStartTime.current;
              }
            }

            if (body.status === "COMPLETED") {
              setStatus("Recherche terminée");
              // --- HISTO --- insertion unique en base
              if (user && !hasLoggedRef.current) {
                hasLoggedRef.current = true;
                const ms_total = searchStartTime.current
                  ? performance.now() - searchStartTime.current
                  : null;
                await supabase.from("search_history").insert({
                  user_id: user.id,
                  session_id: sessionId,
                  query,
                  status: "completed",
                  result_count: results.length, // nb de résultats reçus
                  ms_first_result: firstResultMs.current ?? null,
                  ms_total: ms_total ?? null,
                });
              }
              return;
            } else if (body.status === "ERROR") {
              setStatus("Erreur : " + body.message);
              // --- HISTO --- insertion unique en base (erreur)
              if (user && !hasLoggedRef.current) {
                hasLoggedRef.current = true;
                const ms_total = searchStartTime.current
                  ? performance.now() - searchStartTime.current
                  : null;
                await supabase.from("search_history").insert({
                  user_id: user.id,
                  session_id: sessionId,
                  query,
                  status: "error",
                  result_count: results.length,
                  ms_first_result: firstResultMs.current ?? null,
                  ms_total: ms_total ?? null,
                  error: body.message ?? null,
                });
              }
              return;
            }

            // résultat normal
            setResults((prev) => [...prev, body]);
          } catch (e) {
            console.log("Message reçu :", message.body);
            console.error(e);
          }
        }
      );
    };

    stompClient.current.activate();

    return () => {
      if (stompClient.current) {
        //stompClient.current.deactivate();
      }
    };
  }, [sessionId]);

  const startSearch = () => {
    setResults([]);
    setStatus("Recherche en cours...");

    if (!stompClient.current?.connected) {
      setStatus("STOMP non connecté");
      return;
    }

    searchStartTime.current = performance.now();
    firstResultMs.current = null;
    hasLoggedRef.current = false;

    stompClient.current.publish({
      destination: "/app/startSearch",
      body: JSON.stringify({ query, sessionId }),
    });
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Recherche WebSocket STOMP</h2>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tape ta requête"
      />
      <button onClick={startSearch} style={{ marginLeft: "10px" }}>
        Rechercher
      </button>
      <p>Status : {status}</p>
      <ul>
        {results.map((r, index) => (
          <li key={index}>
            {r.filename} - page {r.page} - paragraphe {r.paragraph} - ligne{" "}
            {r.line}: {r.content}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default WebSocketSearch;
