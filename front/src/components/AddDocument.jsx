// src/AddDocument.jsx
import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faTrash, faUpload } from "@fortawesome/free-solid-svg-icons";
import Navbar from "./Navbar";
import { supabase } from "../supabaseClient";

export default function AddDocument() {
  const [session, setSession] = useState(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => mounted && setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const user = session?.user ?? null;

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const dropRef = useRef(null);

  const pseudo =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    user?.id ||
    "Anonyme";

  const onFilePick = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setStatus("Erreur: sélectionne un PDF (.pdf)");
      return;
    }
    setFile(f);
    setStatus("");
    setProgress(0);
  };

  const onInputChange = (e) => onFilePick(e.target.files?.[0]);

  // Drag & drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e) => {
      prevent(e);
      const f = e.dataTransfer.files?.[0];
      onFilePick(f);
      el.style.borderColor = "#e5e7eb";
      el.style.background = "#fafafa";
    };
    const onDragOver = (e) => {
      prevent(e);
      el.style.borderColor = "#111";
      el.style.background = "#f5f5f5";
    };
    const onDragLeave = (e) => {
      prevent(e);
      el.style.borderColor = "#e5e7eb";
      el.style.background = "#fafafa";
    };

    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    ["dragenter","dragover","dragleave","drop"].forEach(evt =>
      el.addEventListener(evt, prevent)
    );

    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
      ["dragenter","dragover","dragleave","drop"].forEach(evt =>
        el.removeEventListener(evt, prevent)
      );
    };
  }, []);

  const clearFile = () => {
    setFile(null);
    setProgress(0);
    setStatus("");
  };

  const upload = async () => {
    if (!file || !user) return;
    setLoading(true);
    setStatus("");
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("user", pseudo);

      // Utilise XHR pour suivre la progression
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://localhost:8080/api/upload", true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const p = Math.round((e.loaded / e.total) * 100);
          setProgress(p);
        }
      };

      xhr.onload = () => {
        setLoading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            setStatus(`✅ Upload OK: ${json.filename || file.name}`);
          } catch {
            setStatus("✅ Upload OK");
          }
        } else {
          setStatus("Erreur: " + (xhr.responseText || xhr.status));
        }
      };

      xhr.onerror = () => {
        setLoading(false);
        setStatus("Erreur réseau pendant l'upload");
      };

      xhr.send(fd);
    } catch (e) {
      setLoading(false);
      setStatus("Erreur: " + e.message);
    }
  };

  if (!user) {
    return (
      <div>
        <Navbar user={null} />
        <div style={{ padding: 16 }}>Tu dois être connecté pour ajouter un document.</div>
      </div>
    );
  }

  return (
    <div>
      <Navbar user={user} />
      <div style={{ padding: 16, maxWidth: 880, margin: "0 auto" }}>
        <h1 style={{ margin: "8px 0 16px 0" }}>Ajouter un document</h1>

        {/* Card */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#fff",
            display: "grid",
            gap: 16,
          }}
        >
          {/* Dropzone */}
          <div
            ref={dropRef}
            style={{
              border: "2px dashed #e5e7eb",
              borderRadius: 12,
              padding: 24,
              background: "#fafafa",
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              gap: 10,
              cursor: "pointer",
            }}
            onClick={() => document.getElementById("pdf-input")?.click()}
          >
            <FontAwesomeIcon icon={faFilePdf} style={{ fontSize: 32, color: "#111" }} />
            <div style={{ fontWeight: 600 }}>Dépose ton PDF ici</div>
            <div style={{ fontSize: 13, color: "#666" }}>
              ou <span style={{ textDecoration: "underline" }}>clique pour parcourir</span>
            </div>
            <input
              id="pdf-input"
              type="file"
              accept="application/pdf"
              onChange={onInputChange}
              style={{ display: "none" }}
            />
          </div>

          {/* Fichier sélectionné */}
          {file && (
            <div
              style={{
                border: "1px solid #f0f0f0",
                borderRadius: 10,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <FontAwesomeIcon icon={faFilePdf} />
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>
              <button
                onClick={clearFile}
                title="Retirer"
                style={{
                  border: "1px solid #e5e5e5",
                  background: "#fff",
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          )}

          {loading && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span>Envoi…</span>
                <span>{progress}%</span>
              </div>
              <div style={{ width: "100%", height: 8, background: "#eee", borderRadius: 999 }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "#111",
                    borderRadius: 999,
                    transition: "width .2s ease",
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              onClick={upload}
              disabled={!file || loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                cursor: !file || loading ? "not-allowed" : "pointer",
                opacity: !file || loading ? 0.7 : 1,
              }}
            >
              <FontAwesomeIcon icon={faUpload} />
              <span>{loading ? "Envoi..." : "Ajouter le PDF"}</span>
            </button>
          </div>

          {status && (
            <div
              style={{
                fontSize: 14,
                color: status.startsWith("✅") ? "#0a0" : "#c00",
                wordBreak: "break-word",
              }}
            >
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
