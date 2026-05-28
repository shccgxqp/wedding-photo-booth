import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { renderQrCode, clearQr } from '../upload.js';

export default function ResultScreen({ onShootAgain, onBackToLayouts }) {
  const { resultData } = useApp();
  const qrRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  async function handleSaveVideo() {
    // rawUrl = direct video file; downloadUrl = landing page
    const url = resultData?.rawUrl || resultData?.downloadUrl;
    const filename = resultData?.filename || 'video.mp4';
    if (!url) return;

    // Web Share API: iOS shows native sheet → user picks "儲存影片" → Photos
    if (navigator.canShare) {
      setSharing(true);
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: 'video/mp4' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '婚禮影片' });
          return;
        }
      } catch (e) {
        // user cancelled or API unavailable — fall through to download
      } finally {
        setSharing(false);
      }
    }

    // Fallback: trigger browser download
    const a = document.createElement('a');
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

  if (gifModes) {
    return (
      <section className="stage">
        <div className="result-panel" style={{ flexDirection: 'column', gap: '1rem', padding: '1rem', overflowY: 'auto' }}>
          <h2 style={{ textAlign: 'center', margin: '0' }}>GIF 品質比較</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['high', 'opt'].map(mode => {
              const m = gifModes[mode];
              if (!m) return null;
              const labels = {
                high: 'HIGH (NeuQuant 256色 full-res)',
                opt:  'OPT (gifenc 256色 700px 8fps)',
              };
              return (
                <div key={mode} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '200px' }}>
                  <span className="tiny-label">{labels[mode]}</span>
                  <img src={m.downloadUrl} alt={mode} style={{ maxWidth: '260px', maxHeight: '380px', objectFit: 'contain', border: '1px solid #ccc' }} />
                  <a className="download-link" href={m.downloadUrl} target="_blank" rel="noreferrer">開啟 {mode.toUpperCase()}</a>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="primary-btn" type="button" onClick={onShootAgain}>再拍一組</button>
            <button className="ghost-btn" type="button" onClick={onBackToLayouts}>回版型選擇</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="stage">
      <div className="result-panel">
        <div className="result-photo-wrap">
          {blobUrl && isVideo ? (
            <video
              id="resultVideo"
              src={blobUrl}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : blobUrl ? (
            <img id="resultImage" src={blobUrl} alt="完成的拍貼照片" />
          ) : null}
        </div>
        <aside className="download-panel">
          <div className="download-info">
            <div className="download-info-text">
              <span className="tiny-label">READY TO SAVE</span>
              <h2>掃碼帶走這張照片</h2>
              <p className="status-text">
                {hasUpload
                  ? isVideo
                    ? '掃描 QR Code，用 Safari / Chrome 開啟後點「下載影片」存到相簿，再上傳 IG 限動。'
                    : '掃描 QR Code 或點連結，長按照片儲存到相簿。'
                  : '上傳失敗，請點連結在瀏覽器長按儲存。'}
              </p>
            </div>
            <canvas
              ref={qrRef}
              className="qr-canvas"
              width={240}
              height={240}
              aria-label="下載 QR Code"
            />
          </div>
          {hasUpload ? (
            <>
              {isVideo ? (
                <button
                  className="download-link"
                  type="button"
                  disabled={sharing}
                  onClick={handleSaveVideo}
                >
                  {sharing ? '載入中...' : '儲存影片到相簿 / 分享'}
                </button>
              ) : (
                <a
                  className="download-link"
                  href={resultData.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  在瀏覽器開啟照片
                </a>
              )}
            </>
          ) : blobUrl && isVideo ? (
            <button
              className="download-link"
              type="button"
              onClick={() => {
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = 'video.mp4';
                a.click();
              }}
            >
              下載影片
            </button>
          ) : blobUrl ? (
            <a className="download-link" href={blobUrl} target="_blank" rel="noreferrer">
              在瀏覽器開啟照片
            </a>
          ) : null}
          <button className="primary-btn" type="button" onClick={onShootAgain}>
            再拍一組
          </button>
          <button className="ghost-btn" type="button" onClick={onBackToLayouts}>
            回版型選擇
          </button>
        </aside>
      </div>
    </section>
  );
}
