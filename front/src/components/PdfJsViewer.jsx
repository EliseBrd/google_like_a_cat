import React, { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";

import PdfWorker from "pdfjs-dist/build/pdf.worker.mjs?worker";
const workerInstance = new PdfWorker();
pdfjsLib.GlobalWorkerOptions.workerPort = workerInstance;

function parseUrlAndPage(src) {
  if (!src) return { url: "", page: 1 };
  const [base, hash = ""] = src.split("#");
  const params = new URLSearchParams(hash.replace(/^\?/, ""));
  const page = parseInt(params.get("page") || "1", 10);
  console.log("elise_________________");
  console.log( base);
  return { url: base, page: Number.isFinite(page) ? Math.max(1, page) : 1 };
}

export default function PdfJsViewer({ src }) {
  const { url, page: initialPage } = useMemo(() => parseUrlAndPage(src), [src]);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState("");
  const [containerWidth, setContainerWidth] = useState(0);

  // Observer de redimensionnement pour ajuster l'échelle
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setContainerWidth(Math.max(1, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Charger le PDF (binaire)
  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    (async () => {
      setError("");
      setPdfDoc(null);
      setNumPages(0);
      if (!url) return;

      try {
        const res = await fetch(encodeURI(url), {
          credentials: "same-origin",
          headers: { Accept: "application/pdf" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.arrayBuffer();
        if (cancelled) return;

        loadingTask = pdfjsLib.getDocument({ data });
        const doc = await loadingTask.promise;
        if (cancelled) {
          // Libère le doc si arrivé trop tard
          try { doc.cleanup?.(); doc.destroy?.(); } catch {}
          return;
        }

        setPdfDoc(doc);
        setNumPages(doc.numPages);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Impossible de charger le PDF.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy?.();
      } catch {}
    };
  }, [url]);

  // Sync page initiale extraite de l'URL
  useEffect(() => {
    setPageNumber(initialPage);
  }, [initialPage]);

  // Rendu d'une page
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!pdfDoc || !pageNumber) return;

      const page = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const canvas = canvasRef.current;
      const textLayerDiv = textLayerRef.current;
      if (!canvas || !textLayerDiv) return;

      // Ajuste à la largeur du conteneur
      const baseVp = page.getViewport({ scale: 1 });
      const desiredWidth = Math.max(320, containerWidth || 800);
      const scale = desiredWidth / baseVp.width;
      const vp = page.getViewport({ scale });

      const ctx = canvas.getContext("2d", { alpha: false });
      const w = Math.floor(vp.width);
      const h = Math.floor(vp.height);

      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // Reset textLayer
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${w}px`;
      textLayerDiv.style.height = `${h}px`;

      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      if (cancelled) return;

      const textContent = await page.getTextContent();
      await pdfjsLib.renderTextLayer({ textContent, container: textLayerDiv, viewport: vp }).promise;

      // Laisse le DOM peindre
      await new Promise((r) => requestAnimationFrame(r));
    })();

    return () => { cancelled = true; };
  }, [pdfDoc, pageNumber, containerWidth]);

  const goTo = (n) => setPageNumber((p) => Math.max(1, Math.min(n, numPages || 1)));

  return (
    <div className="pdfjs-shell">
      <div className="pdfjs-toolbar">
        <button onClick={() => goTo(pageNumber - 1)} disabled={!pdfDoc || pageNumber <= 1}>◀</button>
        <span>Page {pageNumber} / {numPages || "…"}</span>
        <button onClick={() => goTo(pageNumber + 1)} disabled={!pdfDoc || pageNumber >= numPages}>▶</button>
        {error && <span style={{ marginLeft: "auto", color: "#c00" }}>Erreur: {error}</span>}
      </div>
      <div className="pdfjs-view" ref={containerRef}>
        {!url ? (
          <div className="pdfjs-placeholder">Sélectionne un PDF</div>
        ) : (
          <div className="pdfjs-page">
            <canvas ref={canvasRef} />
            <div ref={textLayerRef} className="textLayer" />
          </div>
        )}
      </div>
    </div>
  );
}
