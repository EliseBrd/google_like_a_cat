import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const navigate = useNavigate();
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
    load();
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      load();
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const ch = supabase
      .channel("sh_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "search_history" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line
  }, []);

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

  return (
    <div style={{ padding: 16, display: "grid", gap: 12 }}>
      <header
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
          <button onClick={exportCSV}>Exporter CSV</button>
          <a href="/" style={{ alignSelf: "center" }}>
            ↩ Retour à la recherche
          </a>
        </div>
      </header>

      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          placeholder="Filtrer par texte…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 260 }}
        />
      </section>

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
        >
          Précédent
        </button>
        <span>
          Page {page + 1} / {totalPages}
        </span>
        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Suivant
        </button>
      </footer>
    </div>
  );
}
