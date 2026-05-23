import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  startCamera, stopCamera, runCountdown,
  captureFrame, triggerFlash, wait,
} from '../camera.js';

export default function CameraScreen({ onAllShotsTaken, onBack }) {
  const {
    config,
    activeLayout,
    activeFrame,
    activeFilter, setActiveFilter,
    shots, setShots,
    facingMode,
    busy, setBusy,
    streamRef,
    filters,
  } = useApp();

  const videoRef = useRef(null);
  const flashRef = useRef(null);
  const wrapRef = useRef(null);
  const previewRef = useRef(null);

  const [countdown, setCountdown] = useState(null);
  const [status, setStatus] = useState('看鏡頭，倒數後會自動拍下。');
  const [shotCount, setShotCount] = useState(0);

  // Start camera on mount, stop on unmount
  useEffect(() => {
    if (videoRef.current) {
      startCamera(streamRef, videoRef.current, facingMode, () => {
        setStatus('無法啟用相機。請確認使用 HTTPS、允許相機權限，並重新整理頁面。');
      });
    }
    return () => stopCamera(streamRef);
  }, []);

  // Preview ratio calculation
  useEffect(() => {
    function updateRatio() {
      const wrap = wrapRef.current;
      const preview = previewRef.current;
      if (!wrap || !preview) return;
      const [rw, rh] = activeLayout.shotRatio.split('/').map(Number);
      const wrapW = wrap.clientWidth;
      const wrapH = wrap.clientHeight;
      let pw, ph;
      if (wrapW / wrapH > rw / rh) {
        ph = wrapH;
        pw = ph * rw / rh;
      } else {
        pw = wrapW;
        ph = pw * rh / rw;
      }
      preview.style.width = `${Math.round(pw)}px`;
      preview.style.height = `${Math.round(ph)}px`;
    }
    const rafId = requestAnimationFrame(() => requestAnimationFrame(updateRatio));
    window.addEventListener('resize', updateRatio);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateRatio);
    };
  }, [activeLayout]);

  // Apply CSS filter to video
  useEffect(() => {
    if (!videoRef.current) return;
    const filterObj = filters.find((f) => f.id === activeFilter);
    videoRef.current.style.filter =
      filterObj && filterObj.filter !== 'none' ? filterObj.filter : '';
  }, [activeFilter, filters]);

  async function handleCapture() {
    if (busy || !streamRef.current) return;
    setBusy(true);

    const required = activeLayout.requiredShots;
    const workCanvas = document.querySelector('#workCanvas');
    let currentShots = [];

    while (currentShots.length < required) {
      const shotNum = currentShots.length + 1;
      setStatus(`第 ${shotNum} 張，準備好了嗎？`);
      await runCountdown(config.countdownSeconds, setCountdown);
      const dataUrl = captureFrame(videoRef.current, workCanvas, activeLayout, activeFilter);
      currentShots = [...currentShots, dataUrl];
      setShots(currentShots);
      setShotCount(currentShots.length);
      await triggerFlash(flashRef.current);
      if (currentShots.length < required) {
        await wait(1200);
      }
    }

    setBusy(false);
    onAllShotsTaken(currentShots);
  }

  const required = activeLayout.requiredShots;
  const nextShot = Math.min(shotCount + 1, required);
  const isSmile = countdown === 'smile';

  return (
    <section className="stage">
      <div className="camera-panel">
        <div className="camera-col">
          <div className="camera-preview-wrap" ref={wrapRef}>
            <div className="camera-preview" ref={previewRef}>
              <video ref={videoRef} autoPlay playsInline muted />
              {activeLayout.showHeartGuide && (
                <svg className="camera-heart-guide" viewBox="-22 -5 359 376" aria-hidden="true">
                  <path
                    d="M 157.5 332 C 126 249 0 166 0 106 C 0 20 110 0 157.5 93 C 205 0 315 20 315 106 C 315 166 189 249 157.5 332 Z"
                    fill="none"
                    stroke="rgba(255,255,255,0.78)"
                    strokeWidth="5"
                    strokeDasharray="14 10"
                  />
                </svg>
              )}
              {countdown !== null && (
                <div className={`countdown${isSmile ? ' countdown--smile' : ''}`}>
                  {isSmile ? 'smile' : countdown}
                </div>
              )}
              <div className="shot-badge">{nextShot} / {required}</div>
              <div className="flash-overlay" ref={flashRef} />
            </div>
          </div>
          <div className="filter-bar">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={`filter-pill${activeFilter === filter.id ? ' active' : ''}`}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.name}
              </button>
            ))}
          </div>
        </div>
        <aside className="side-panel">
          <span className="tiny-label">{activeLayout.name}</span>
          <h2>準備拍攝</h2>
          <p className="status-text">{status}</p>
          <button
            className="primary-btn"
            type="button"
            disabled={busy}
            onClick={handleCapture}
          >
            開始拍攝
          </button>
          <button
            className="ghost-btn"
            type="button"
            disabled={busy}
            onClick={onBack}
          >
            回邊框選擇
          </button>
        </aside>
      </div>
    </section>
  );
}
