import React, { useEffect, useState, useRef } from "react";
import ResultsByFile from "./components/ResultsByFile";
import PdfJsViewer from "./components/PdfJsViewer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { Client } from "@stomp/stompjs";
import { supabase } from "./supabaseClient";
import UploadBox from "./components/UploadBox";

function AuthUI() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = window.location.origin;
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setMsg("Compte créé. Vérifie tes emails pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMsg("Connecté ✅");
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setErr("");
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) setErr(error.message);
    else setMsg("Email de réinitialisation envoyé (si le compte existe).");
  };

  return (
    <div
      style={{
        height: "fit-content",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 8, width: 320,  height: "fit-content" }}>
        <h2 style={{ marginBottom: 8 }}>
          {mode === "signup" ? "Créer un compte" : "Se connecter"}
        </h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "..." : mode === "signup" ? "Créer" : "Se connecter"}
        </button>
        <button type="button" onClick={resetPassword}>
          Mot de passe oublié ?
        </button>
        <div style={{ fontSize: 14 }}>
          {mode === "signup" ? (
            <>
              Déjà un compte ?{" "}
              <a href="#signin" onClick={() => setMode("signin")}>
                Se connecter
              </a>
            </>
          ) : (
            <>
              Nouveau ?{" "}
              <a href="#signup" onClick={() => setMode("signup")}>
                Créer un compte
              </a>
            </>
          )}
        </div>
        {msg && <div style={{ color: "#0a0" }}>{msg}</div>}
        {err && <div style={{ color: "#c00" }}>Erreur: {err}</div>}
      </form>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setAuthLoading(false);
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
  user?.user_metadata?.username
  || user?.email?.split("@")[0]
  || user?.id
  || "Anonyme";

  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedUrl, setSelectedUrl] = useState("");
  const stompClient = useRef(null);
  const sessionId = user?.id || "user123";
  const [searchQuery, setSearchQuery] = useState("");

  // ⏱ Timer
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
        (message) => {
          try {
            console.log(message)
            if (message.body === "COMPLETED") {
              console.log("Recherche terminée");
              setLoading(false);
              return;
            }
            const data = JSON.parse(message.body);

            // ⏱ Calcul du temps jusqu’au premier résultat
            if (searchStartTime.current) {
              const elapsed = performance.now() - searchStartTime.current;
              setElapsedTime(elapsed.toFixed(2)); // en ms
              searchStartTime.current = null; // reset après premier résultat
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

  // 🚀 Fonction manuelle de lancement de recherche
  const startSearch = (query) => {
    if (!query.trim()) return;

    setHits([]);
    setLoading(true);
    setError("");
    setElapsedTime(null);

    if (stompClient.current?.connected) {
      searchStartTime.current = performance.now();
      stompClient.current.publish({
        destination: "/app/startSearch",
        body: JSON.stringify({ query, sessionId }),
      });
    } else {
      setError("Impossible de se connecter au serveur WebSocket");
      setLoading(false);
    }
  };

  // ⚡ Gérer l’appui sur Entrée
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setSearchQuery(q);
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

  if (authLoading) return <div style={{ padding: 16 }}>Chargement...</div>;
  if (!user) return <AuthUI />;

  return (
    <div
      style={{ height: "fit-content", display: "grid", gridTemplateRows: "auto 1fr" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #eee",
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Rechercher dans les documents
          </h1>
          <div style={{ fontSize: 12, color: "#666" }}>
            Connecté en tant que <strong>{user.email}</strong>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <UploadBox user={user} />
          <button onClick={() => supabase.auth.signOut()}>Déconnexion</button>
        </div>
      </div>

      <div style={{ margin: "0 0", width: "50%", left: 0, padding: "16px", height: "fit-content" }}>
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
            onKeyDown={handleKeyDown}
            placeholder="Tapez votre requête et appuyez sur Entrée…"
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
            query={searchQuery}
            onSelectUrl={(url) => setSelectedUrl(url)}
          />
        </div>

        <PdfJsViewer src={selectedUrl} query={searchQuery} />
      </div>
    </div>
  );
}
