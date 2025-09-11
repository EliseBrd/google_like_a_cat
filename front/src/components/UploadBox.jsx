// UploadBox.jsx
import React, { useState } from "react";

export default function UploadBox({ user }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const pseudo =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    user?.id ||
    "Anonyme";

  const onChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setStatus("");
  };

  const onUpload = async () => {
    if (!file) return;
    setLoading(true);
    setStatus("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("user", pseudo);

      const res = await fetch("http://localhost:8080/api/upload", { method: "POST", body: fd });


      const txt = await res.text();
      if (!res.ok) {
        setStatus("Erreur: " + txt);
      } else {
        try {
          const json = JSON.parse(txt);
          setStatus(`✅ Upload OK: ${json.filename}`);
        } catch {
          setStatus("✅ Upload OK");
        }
      }
    } catch (e) {
      setStatus("Erreur: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input type="file" accept="application/pdf" onChange={onChange} />
      <button onClick={onUpload} disabled={!file || loading}>
        {loading ? "Envoi..." : "Ajouter le PDF"}
      </button>
      {status && <div style={{ fontSize: 13, color: status.startsWith("✅") ? "#0a0" : "#c00" }}>{status}</div>}
    </div>
  );
}
