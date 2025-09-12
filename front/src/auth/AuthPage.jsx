import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useLocation, useNavigate, Link } from "react-router-dom";

export default function AuthPage() {
  const [mode, setMode] = useState("signin"); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = window.location.origin;
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate(from, { replace: true });
    });
  }, [from, navigate]);

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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(from, { replace: true }); 
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) setErr(error.message);
    else setMsg("Email de réinitialisation envoyé (si le compte existe).");
  };

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={submit} style={{
        display: "grid", gap: 10, width: 340, padding: 20, border: "1px solid #eee",
        borderRadius: 12, background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,.04)"
      }}>
        <h2 style={{ margin: 0 }}>{mode === "signup" ? "Créer un compte" : "Se connecter"}</h2>

        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e5e5" }}
        />
        <input
          type="password" placeholder="Mot de passe" value={password}
          onChange={(e) => setPassword(e.target.value)} required
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e5e5" }}
        />

        <button type="submit" disabled={loading}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff" }}>
          {loading ? "…" : mode === "signup" ? "Créer" : "Se connecter"}
        </button>

        <button type="button" onClick={resetPassword}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff" }}>
          Mot de passe oublié ?
        </button>

        <div style={{ fontSize: 14 }}>
          {mode === "signup" ? (
            <>Déjà un compte ? <button type="button" onClick={() => setMode("signin")} style={linkBtn}>Se connecter</button></>
          ) : (
            <>Nouveau ? <button type="button" onClick={() => setMode("signup")} style={linkBtn}>Créer un compte</button></>
          )}
        </div>

        {msg && <div style={{ color: "#0a0" }}>{msg}</div>}
        {err && <div style={{ color: "#c00" }}>Erreur: {err}</div>}

        <div style={{ textAlign: "center", marginTop: 6, fontSize: 12 }}>
          <Link to="/" style={{ color: "#666" }}>← Retour à l’accueil</Link>
        </div>
      </form>
    </div>
  );
}

const linkBtn = {
  border: "none",
  background: "none",
  color: "#111",
  textDecoration: "underline",
  cursor: "pointer",
  padding: 0,
  fontSize: 14,
};
