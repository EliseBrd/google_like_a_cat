import React, { useMemo } from "react";

function groupByFilename(hits = []) {
  const map = new Map();
  for (const h of hits) {
    const key = h.filename || "Sans_nom";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(h);
  }
  return map;
}

export default function ResultsByFile({ hits, query }) {
  const groups = useMemo(() => groupByFilename(hits), [hits]);

  if (!hits?.length) {
    return <div className="no-results">Aucun résultat.</div>;
  }

  return (
    <div className="accordion">
      {Array.from(groups.entries()).map(([filename, items], idx) => {
        const sortedItems = [...items].sort((a, b) => {
          const pageA = a.page ?? 0;
          const pageB = b.page ?? 0;
          if (pageA !== pageB) return pageA - pageB;

          const lineA = a.line ?? 0;
          const lineB = b.line ?? 0;
          return lineA - lineB;
        });

        return (
          <details className="acc-item" key={filename} open={idx === 0}>
            <summary className="acc-summary">
              <span className="acc-filename">{filename}</span>
              <span className="acc-count">
                {sortedItems.length} occurrence
                {sortedItems.length > 1 ? "s" : ""}
              </span>
            </summary>

            <div className="acc-content">
              {sortedItems.map((hit, i) => (
                <Occurrence key={`${filename}-${i}`} hit={hit} query={query} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function Occurrence({ hit, query }) {
  const { url, filename, page, line, lineContent, content } = hit;

  const highlight = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i}>{part}</mark> : part
    );
  };

  return (
    <div className="occ">
      <div className="occ-meta">
        <span>Page {page ?? "?"}</span>
        {typeof line !== "undefined" && <span> · ligne {line}</span>}
      </div>

      {content && <div className="occ-content">{content}</div>}

      {lineContent && (
        <pre className="occ-line">{highlight(lineContent, query)}</pre>
      )}

      {url && (
        <a className="occ-link" href={url} target="_blank" rel="noreferrer">
          {url.startsWith("/pdf/")
            ? url
            : `Ouvrir ${filename || "le document"}`}
        </a>
      )}
    </div>
  );
}
