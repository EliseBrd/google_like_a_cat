// src/HistoryPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { supabase } from "../supabaseClient";

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setAuthLoading(false);
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

  // --- Data état
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState(null);

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      let query = supabase
        .from("search_history")
        .select(
          "id, query, status, result_count, ms_first_result, ms_total, created_at",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (q) query = query.ilike("query", `%${q}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      setRows(data ?? []);
      setTotal(count ?? 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return; // on attend l’auth (RLS)
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user]);

  // petite latence pour le filtre texte
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      setPage(0);
      load();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, user]);

  // Realtime (écoute des changements)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("sh_changes_history")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "search_history" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE)),
    [total]
  );

  const exportCSV = () => {
    const header = [
      "created_at",
      "query",
      "status",
      "result_count",
      "ms_first_result",
      "ms_total",
    ].join(",");
    const lines = rows.map((r) =>
      [
        r.created_at,
        JSON.stringify(r.query),
        r.status,
        r.result_count ?? 0,
        r.ms_first_result ?? "",
        r.ms_total ?? "",
      ].join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search_history_page_${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const relaunch = (query) => {
    navigate(`/?q=${encodeURIComponent(query)}`);
  };

  if (authLoading) {
    return (
      <div>
        <Navbar user={null} />
        <div style={{ padding: 16 }}>Chargement…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Navbar user={null} />
        <div style={{ padding: 16 }}>
          Tu dois être connecté pour voir ton historique.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar user={user} />

      <div style={{ padding: 16, display: "grid", gap: 12, maxWidth: 1000, margin: "0 auto" }}>
        {/* En-tête de page */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Historique des recherches</h1>
            <div style={{ fontSize: 12, color: "#666" }}>
              Total: {total ?? "…"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={exportCSV}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e5e5e5",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Exporter CSV
            </button>
          </div>
        </div>

        {/* Filtres */}
        <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            placeholder="Filtrer par texte…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              minWidth: 260,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e5e5",
              outline: "none",
            }}
          />
        </section>

        {/* Liste */}
        {loading ? (
          <div>Chargement…</div>
        ) : error ? (
          <div style={{ color: "#c00" }}>Erreur: {error}</div>
        ) : rows.length === 0 ? (
          <div style={{ color: "#666" }}>Aucun résultat.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: 10,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <strong
                    style={{ cursor: "pointer" }}
                    onClick={() => relaunch(r.query)}
                    title="Relancer cette recherche"
                  >
                    {r.query}
                  </strong>
                  <span style={{ fontSize: 12, color: "#666" }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {r.status?.toUpperCase()} • {r.result_count ?? 0} résultats
                  {r.ms_first_result != null && (
                    <> • 1er: {Number(r.ms_first_result).toFixed(0)} ms</>
                  )}
                  {r.ms_total != null && (
                    <> • total: {Number(r.ms_total).toFixed(0)} ms</>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <footer
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e5e5e5",
              background: page === 0 ? "#f7f7f7" : "#fff",
              cursor: page === 0 ? "not-allowed" : "pointer",
            }}
          >
            Précédent
          </button>
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <button
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #111",
              background: page + 1 >= totalPages ? "#f7f7f7" : "#111",
              color: page + 1 >= totalPages ? "#999" : "#fff",
              cursor: page + 1 >= totalPages ? "not-allowed" : "pointer",
            }}
          >
            Suivant
          </button>
        </footer>
      </div>
    </div>
  );
}
