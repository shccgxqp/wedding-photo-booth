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
                {hasUpload ? '掃描 QR Code 或點連結，長按照片儲存到相簿。' : '上傳失敗，請點連結在瀏覽器長按儲存。'}
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
              在瀏覽器開啟照片
            </a>
          ) : blobUrl ? (
            <a
              className="download-link"
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
            >
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
