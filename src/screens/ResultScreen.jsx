import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { renderQrCode, clearQr } from "../upload.js";

function Sprig({
  size = 36,
  color = "#E4C97E",
  rotate = 0,
  opacity = 0.45,
  style = {},
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      style={{
        transform: `rotate(${rotate}deg)`,
        opacity,
        position: "absolute",
        ...style,
      }}
    >
      <g stroke={color} strokeWidth="0.9" fill="none" strokeLinecap="round">
        <path d="M30 8 Q 30 30 30 52" />
        <path d="M30 16 Q 22 18 18 14" />
        <path d="M30 16 Q 38 18 42 14" />
        <path d="M30 24 Q 20 26 14 22" />
        <path d="M30 24 Q 40 26 46 22" />
        <path d="M30 34 Q 22 36 18 32" />
        <path d="M30 34 Q 38 36 42 32" />
        <path d="M30 44 Q 24 45 21 42" />
        <path d="M30 44 Q 36 45 39 42" />
      </g>
      <g fill={color}>
        <circle cx="22" cy="18" r="1.5" />
        <circle cx="38" cy="18" r="1.5" />
        <circle cx="14" cy="22" r="1.7" />
        <circle cx="46" cy="22" r="1.7" />
        <circle cx="22" cy="36" r="1.4" />
        <circle cx="38" cy="36" r="1.4" />
      </g>
    </svg>
  );
}

export default function ResultScreen({ onShootAgain, onBackToLayouts }) {
  const { resultData, config } = useApp();
  const qrRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  async function handleSaveVideo() {
    const url = resultData?.rawUrl || resultData?.downloadUrl;
    const filename = resultData?.filename || "video.mp4";
    if (!url) return;
    if (navigator.canShare) {
      setSharing(true);
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: "video/mp4" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "婚禮影片" });
          return;
        }
      } catch (e) {
        /* fall through */
      } finally {
        setSharing(false);
      }
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  useEffect(() => {
    if (!qrRef.current) return;
    if (resultData?.downloadUrl) {
      renderQrCode(resultData.downloadUrl, qrRef.current).catch(console.error);
    } else {
      clearQr(qrRef.current);
    }
  }, [resultData]);

  const hasUpload = Boolean(resultData?.downloadUrl);
  const blobUrl = resultData?.blobUrl;
  const gifModes = resultData?.gifModes;
  const isVideo = Boolean(resultData?.isVideo);
  const filename = resultData?.filename || "";

  const coupleNames = (config?.coupleName || "jim & camilla").toUpperCase();
  const weddingDate = (config?.weddingDate || "2026.11.07").replace(/\./g, ".");

  // ── GIF comparison mode (dev/test only) ──────────────────────────
  if (gifModes) {
    return (
      <section className="stage">
        <div className="result-screen-bg">
          <div className="result-screen-overlay" />
        </div>
        <div
          className="result-panel"
          style={{
            flexDirection: "column",
            gap: "1rem",
            padding: "1rem",
            overflowY: "auto",
          }}
        >
          <h2 style={{ textAlign: "center", margin: 0 }}>GIF 品質比較</h2>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {["high", "opt"].map((mode) => {
              const m = gifModes[mode];
              if (!m) return null;
              return (
                <div
                  key={mode}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    minWidth: 200,
                  }}
                >
                  <span className="tiny-label">
                    {mode === "high"
                      ? "HIGH (NeuQuant 256色)"
                      : "OPT (gifenc 700px 8fps)"}
                  </span>
                  <img
                    src={m.downloadUrl}
                    alt={mode}
                    style={{
                      maxWidth: 260,
                      maxHeight: 380,
                      objectFit: "contain",
                      border: "1px solid #BD9A4E",
                    }}
                  />
                  <a
                    className="download-link"
                    href={m.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    開啟 {mode.toUpperCase()}
                  </a>
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              className="result-btn-primary"
              type="button"
              onClick={onShootAgain}
            >
              再 拍 一 組
            </button>
            <button
              className="result-btn-outline"
              type="button"
              onClick={onBackToLayouts}
            >
              回 首 頁 重 選
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── Main result screen ────────────────────────────────────────────
  return (
    <section className="stage">
      <div className="result-screen-bg">
        <div className="result-screen-overlay" />
      </div>

      {/* Decorative sprigs */}
      <Sprig size={40} rotate={-20} style={{ top: 120, left: 80 }} />
      <Sprig size={32} rotate={30} style={{ top: 180, right: 100 }} />

      <div className="result-wrap">
        {/* ── Photo / Video ── */}
        <div className="result-photo-area">
          {blobUrl && isVideo ? (
            <video
              src={blobUrl}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              style={{
                display: "block",
                maxHeight: "min(58vh, 640px)",
                maxWidth: "100%",
                width: "auto",
                height: "auto",
                margin: "0 auto",
                borderRadius: 8,
                boxShadow: "0 36px 70px -28px rgba(0,0,0,0.82)",
              }}
            />
          ) : blobUrl ? (
            <div className="result-photo-mat">
              <img
                src={blobUrl}
                alt="完成的拍貼照片"
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "min(58vh, 640px)",
                  width: "auto",
                  height: "auto",
                }}
              />
            </div>
          ) : null}
        </div>

        {/* ── Bottom row ── */}
        <div className="result-bottom-row">
          {/* QR card */}
          <div className="result-qr-card">
            <div className="result-qr-card-border" />
            <div
              style={{
                background: "#fff",
                padding: 6,
                border: "1px solid #D8C39C",
                flexShrink: 0,
              }}
            >
              <canvas
                ref={qrRef}
                width={150}
                height={150}
                aria-label="下載 QR Code"
                style={{ display: "block" }}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="result-actions">
            <button
              className="result-btn-primary"
              type="button"
              onClick={onShootAgain}
            >
              再 拍 一 張
            </button>
            <button
              className="result-btn-outline"
              type="button"
              onClick={onBackToLayouts}
            >
              回 首 頁 重 選
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
