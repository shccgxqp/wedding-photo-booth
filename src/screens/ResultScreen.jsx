import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { renderQrCode, clearQr } from '../upload.js';

export default function ResultScreen({ onShootAgain, onBackToLayouts }) {
  const { resultData } = useApp();
  const qrRef = useRef(null);

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

  return (
    <section className="stage">
      <div className="result-panel">
        <div className="result-photo-wrap">
          {blobUrl && <img id="resultImage" src={blobUrl} alt="完成的拍貼照片" />}
        </div>
        <aside className="download-panel">
          <div className="download-info">
            <div className="download-info-text">
              <span className="tiny-label">READY TO SAVE</span>
              <h2>掃碼帶走這張照片</h2>
              <p className="status-text">
                {hasUpload ? '照片已存到伺服器。' : '上傳失敗，請用下方連結下載。'}
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
            <a
              className="download-link"
              href={resultData.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              開啟下載連結
            </a>
          ) : blobUrl ? (
            <a
              className="download-link"
              href={blobUrl}
              download="photo-booth.jpg"
            >
              下載照片
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
