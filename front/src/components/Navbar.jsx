import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClockRotateLeft, faPlus, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../supabaseClient";

export default function Navbar({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: "1px solid #eee",
        background: "#fff",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Branding */}
      <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#111",
              color: "#fff",
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
            }}
            aria-label="Logo"
          >
            R
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
              Rechercher dans les documents
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              Connecté en tant que <strong>{user?.email}</strong>
            </div>
          </div>
        </div>
      </Link>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Link
          to="/history"
          title="Historique"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            background: isActive("/history") ? "#f3f4f6" : "#fff",
            color: "#111",
            textDecoration: "none",
          }}
        >
          <FontAwesomeIcon icon={faClockRotateLeft} />
          <span>Historique</span>
        </Link>

        <Link
          to="/add-document"
          title="Ajouter un document"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Ajouter un document</span>
        </Link>

        <button
          onClick={logout}
          title="Déconnexion"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            background: "#fff",
            color: "#111",
            cursor: "pointer",
          }}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>Déconnexion</span>
        </button>
      </div>
    </nav>
  );
}
