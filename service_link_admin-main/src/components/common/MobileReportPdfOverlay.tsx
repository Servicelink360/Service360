import { CloseCircleOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  url: string;
  onClose: () => void;
};

const PDFJS_CDN = "2.16.105";

type PdfJsLib = {
  version: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string | { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => {
    promise: Promise<void>;
  };
};

let pdfJsLoadPromise: Promise<PdfJsLib> | null = null;

function loadPdfJs(): Promise<PdfJsLib> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as Window & { pdfjsLib?: PdfJsLib };
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (pdfJsLoadPromise) return pdfJsLoadPromise;
  pdfJsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_CDN}/pdf.min.js`;
    script.async = true;
    script.onload = () => {
      const lib = w.pdfjsLib;
      if (!lib) {
        reject(new Error("pdf.js failed to load"));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_CDN}/pdf.worker.min.js`;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("pdf.js script failed"));
    document.head.appendChild(script);
  });
  return pdfJsLoadPromise;
}

/** Report PDFs are public (S3 / public/pdf). Omit credentials — S3 CORS rejects `*` with credentials. */
async function fetchReportPdfBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!response.ok) throw new Error("fetch failed");
  return response.arrayBuffer();
}

const MobileReportPdfOverlay: React.FC<Props> = ({ url, onClose }) => {
  const pagesHostRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host = pagesHostRef.current;
    if (host) host.innerHTML = "";

    const render = async () => {
      setLoading(true);
      setError(null);
      try {
        const pdfjsLib = await loadPdfJs();
        const data = await fetchReportPdfBytes(url);
        if (cancelled || !pagesHostRef.current) return;

        const pdf = await pdfjsLib.getDocument({ data }).promise;
        const hostEl = pagesHostRef.current;
        if (cancelled || !hostEl) return;
        hostEl.innerHTML = "";

        const firstPage = await pdf.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        const cssScale = Math.min((window.innerWidth - 8) / baseViewport.width, 2.5);
        const dpr = window.devicePixelRatio || 1;
        const renderScale = cssScale * dpr;

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
          if (cancelled || !pagesHostRef.current) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: renderScale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.style.display = "block";
          canvas.style.margin = "0 auto 8px";
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          hostEl.appendChild(canvas);
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Could not load PDF");
          setLoading(false);
        }
      }
    };

    void render();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return createPortal(
    <div
      className="nr-mobile-pdf-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Report PDF"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <button
        type="button"
        aria-label="Close PDF"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "max(12px, env(safe-area-inset-top))",
          right: "max(12px, env(safe-area-inset-right))",
          zIndex: 10051,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.95)",
          color: "#141414",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          lineHeight: 1,
          boxShadow: "0 2px 12px rgba(0,0,0,0.45)",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <CloseCircleOutlined />
      </button>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "8px 4px 16px",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
            <Spin size="large" />
          </div>
        ) : null}
        {error ? (
          <p style={{ color: "#fff", textAlign: "center", paddingTop: 48 }}>{error}</p>
        ) : null}
        <div ref={pagesHostRef} />
      </div>
    </div>,
    document.body,
  );
};

export default MobileReportPdfOverlay;
