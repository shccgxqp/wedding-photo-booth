import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  startCamera, stopCamera, runCountdown,
  captureFrame, triggerFlash, wait,
} from '../camera.js';
import { ZONES as F01_ZONES } from '../frames/frame01.js';
import { ZONES as F02_ZONES } from '../frames/frame02.js';
import { ZONES as F03_ZONES } from '../frames/frame03.js';
import { ZONES as F04_ZONES } from '../frames/frame04.js';
import { startClipRecorder, encodeClipGif, startClipRecorderHQ, encodeFramesAsJpegs, RECORD_MS } from '../gif.js';
import { uploadClipGif, requestGifCompose, uploadJpegFrame, requestGifComposeJpeg } from '../upload.js';
import { startVideoClipRecorder, composeMultiZoneVideo, VIDEO_DURATION_MS, getBestVideoMime, isIgCompatible } from '../video.js';

const FRAME_GUIDE = {
  frame01: { zones: F01_ZONES, w: 779,  h: 1172, url: '/frames/frame01.png' },
  frame02: { zones: F02_ZONES, w: 784,  h: 1176, url: '/frames/frame02.png' },
  frame03: { zones: F03_ZONES, w: 858,  h: 2532, url: '/frames/frame03.png' },
  frame04: { zones: F04_ZONES, w: 2090, h: 3135, url: '/frames/frame04.png' },
};

export default function CameraScreen({ onAllShotsTaken, onGifTaken, onGifComposing, onVideoReady, onVideoComposing, onBackToLayouts }) {
  const {
    config,
    activeLayout,
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
  const [previewPx, setPreviewPx] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      startCamera(streamRef, videoRef.current, facingMode, () => {
        setStatus('無法啟用相機。請確認使用 HTTPS、允許相機權限，並重新整理頁面。');
      });
    }
    return () => stopCamera(streamRef);
  }, []);

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
      setPreviewPx(Math.round(pw));
    }
    const rafId = requestAnimationFrame(() => requestAnimationFrame(updateRatio));
    window.addEventListener('resize', updateRatio);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateRatio);
    };
  }, [activeLayout]);

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

    try {
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
      onAllShotsTaken(currentShots);
    } catch (err) {
      console.error('Capture error:', err);
      setStatus('拍攝失敗，請重試。');
    } finally {
      setBusy(false);
    }
  }

  async function handleVideoCapture() {
    if (busy || !streamRef.current) return;
    setBusy(true);

    const required = activeLayout.requiredShots;
    const fg = FRAME_GUIDE[activeLayout.id];
    const clips = [];

    try {
      for (let i = 0; i < required; i++) {
        setStatus(`影片第 ${i + 1} 格，準備好了嗎？`);
        setShotCount(i);
        await runCountdown(config.countdownSeconds, setCountdown);
        setCountdown('rec');

        const clipRec = startVideoClipRecorder(streamRef.current, VIDEO_DURATION_MS);
        await triggerFlash(flashRef.current);

        setStatus(`錄製中...`);
        const blob = await clipRec.blobPromise;
        clips.push(blob);
        setCountdown(null);

        if (i < required - 1) {
          setStatus(`第 ${i + 1} 格完成，繼續下一格...`);
          await wait(600);
        }
      }

      setStatus('合成影片中...');
      setCountdown(null);
      onVideoComposing();

      const videoBlob = await composeMultiZoneVideo(
        clips,
        fg ? fg.zones : [],
        activeLayout.width,
        activeLayout.height,
        fg ? fg.url : '',
        VIDEO_DURATION_MS,
      );

      onVideoReady(videoBlob);
    } catch (err) {
      console.error('Video capture error:', err);
      setStatus('影片錄製失敗，請重試。');
      setBusy(false);
    }
  }

  async function handleGifCapture() {
    if (busy || !streamRef.current) return;
    setBusy(true);

    const required = activeLayout.requiredShots;
    const fg = FRAME_GUIDE[activeLayout.id];
    const sessionId = crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

    const uploadPromises = [];

    try {
      for (let i = 0; i < required; i++) {
        setStatus(`動態第 ${i + 1} 格，準備好了嗎？`);
        setShotCount(i);
        const recorder = startClipRecorder(videoRef.current, activeFilter);
        await runCountdown(config.countdownSeconds, setCountdown);
        const frames = recorder.stop();
        await triggerFlash(flashRef.current);

        // encode + upload in background — don't block next shot
        const clipGif = encodeClipGif(frames);
        uploadPromises.push(uploadClipGif(clipGif, sessionId, i));

        if (i < required - 1) {
          setStatus(`第 ${i + 1} 格完成，繼續下一格...`);
          await wait(600);
        }
      }

      setStatus('等待上傳完成...');
      await Promise.all(uploadPromises);
      setCountdown(null);
      onGifComposing();

      let result;
      try {
        result = await requestGifCompose(
          sessionId,
          activeLayout.id,
          activeLayout.width,
          activeLayout.height,
          fg ? fg.zones : [],
        );
      } catch (composeErr) {
        console.error('GIF compose error:', composeErr);
        result = { downloadUrl: null, filename: null };
      }
      onGifTaken(result);
    } catch (err) {
      console.error('GIF capture error:', err);
      setStatus('錄製失敗，請重試。');
      setBusy(false);
    }
  }

  async function handleGifCaptureHQ() {
    if (busy || !streamRef.current) return;
    setBusy(true);

    const required = activeLayout.requiredShots;
    const fg = FRAME_GUIDE[activeLayout.id];
    const sessionId = crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

    // smile duration inside runCountdown (700ms) already counts as recording time
    const SMILE_HOLD_MS = 700;

    const uploadPromises = [];

    try {
      for (let i = 0; i < required; i++) {
        setStatus(`動態第 ${i + 1} 格，準備好了嗎？`);
        setShotCount(i);

        let recorder = null;

        // Intercept 'smile' tick to start recording + flash
        const smileTick = (value) => {
          setCountdown(value);
          if (value === 'smile') {
            recorder = startClipRecorderHQ(videoRef.current, activeFilter);
            // Initial shutter flash then pulse during recording
            triggerFlash(flashRef.current).then(() => {
              flashRef.current?.classList.add('recording-pulse');
            });
          }
        };

        await runCountdown(config.countdownSeconds, smileTick);
        // runCountdown resolves after smile shown SMILE_HOLD_MS then set null
        // recording started at smile → already SMILE_HOLD_MS elapsed

        const remaining = RECORD_MS - SMILE_HOLD_MS;
        if (remaining > 0) await wait(remaining);

        // Stop recording flash
        flashRef.current?.classList.remove('recording-pulse');

        const frames = recorder ? recorder.stop() : [];

        const clipIdx = i;
        uploadPromises.push(
          encodeFramesAsJpegs(frames).then(jpegBlobs =>
            Promise.all(jpegBlobs.map((blob, frameIdx) =>
              uploadJpegFrame(blob, sessionId, clipIdx, frameIdx)
            ))
          )
        );

        if (i < required - 1) {
          setStatus(`第 ${i + 1} 格完成，繼續下一格...`);
          await wait(600);
        }
      }

      setStatus('等待上傳完成...');
      await Promise.all(uploadPromises);
      setCountdown(null);
      onGifComposing();

      let result;
      try {
        result = await requestGifComposeJpeg(
          sessionId,
          activeLayout.id,
          activeLayout.width,
          activeLayout.height,
          fg ? fg.zones : [],
        );
      } catch (composeErr) {
        console.error('GIF HQ compose error:', composeErr);
        result = null;
      }
      onGifTaken({ gifModes: result });
    } catch (err) {
      console.error('GIF HQ capture error:', err);
      setStatus('錄製失敗，請重試。');
      setBusy(false);
    }
  }

  const required = activeLayout.requiredShots;
  const nextShot = Math.min(shotCount + 1, required);
  const isSmile = countdown === 'smile';
  const isRec = countdown === 'rec';

  const heartGuideStyle = (() => {
    const fg = FRAME_GUIDE[activeLayout.id];
    if (!fg || previewPx === 0) return null;
    const zone = fg.zones[Math.min(shotCount, fg.zones.length - 1)];
    const scale = previewPx / zone.w;
    return {
      backgroundImage: `url(${fg.url})`,
      backgroundSize: `${Math.round(fg.w * scale)}px ${Math.round(fg.h * scale)}px`,
      backgroundPosition: `${-Math.round(zone.x * scale)}px ${-Math.round(zone.y * scale)}px`,
      backgroundRepeat: 'no-repeat',
    };
  })();

  return (
    <section className="stage">
      <div className="camera-panel">
        <div className="camera-col">
          <div className="camera-preview-wrap" ref={wrapRef}>
            <div className="camera-preview" ref={previewRef}>
              <video ref={videoRef} autoPlay playsInline muted />
              {heartGuideStyle && (
                <div className="camera-heart-guide" style={heartGuideStyle} aria-hidden="true" />
              )}
              {countdown !== null && (
                <div className={`countdown${isSmile ? ' countdown--smile' : ''}${isRec ? ' countdown--rec' : ''}`}>
                  {isSmile ? 'smile' : isRec ? '●REC' : countdown}
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
            className="ghost-btn"
            type="button"
            disabled={busy}
            onClick={config.gifMode === 'test' ? handleGifCaptureHQ : handleGifCapture}
          >
            {config.gifMode === 'test' ? '拍攝動動照片（品質測試）' : '拍攝動動照片'}
          </button>
          <button
            className="ghost-btn"
            type="button"
            disabled={busy}
            onClick={handleVideoCapture}
            title={isIgCompatible(getBestVideoMime()) ? 'MP4 — 可直接上傳 IG 限動' : 'WebM — 需轉檔才能上傳 IG'}
          >
            拍攝影片 {isIgCompatible(getBestVideoMime()) ? '🎬' : '🎬⚠️'}
          </button>
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
            onClick={onBackToLayouts}
          >
            回版型選擇
          </button>
        </aside>
      </div>
    </section>
  );
}
