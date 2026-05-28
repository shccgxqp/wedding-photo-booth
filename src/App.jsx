import { useEffect } from 'react';
import { useApp } from './context/AppContext.jsx';
import { stopCamera } from './camera.js';
import { composePhoto } from './compose.js';
import { uploadPhoto, uploadVideo } from './upload.js';
import TopBar from './components/TopBar.jsx';
import LayoutScreen from './screens/LayoutScreen.jsx';
import CameraScreen from './screens/CameraScreen.jsx';
import LoadingScreen from './screens/LoadingScreen.jsx';
import ResultScreen from './screens/ResultScreen.jsx';
import FilterEditorScreen from './screens/FilterEditorScreen.jsx';

export default function App() {
  const {
    config, setConfig,
    activeLayout, setActiveLayout,
    activeFilter, setActiveFilter,
    shots, setShots,
    facingMode,
    screen, setScreen,
    setResultData,
    setBusy,
    streamRef,
    layouts,
    setBackgrounds,
  } = useApp();

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig((prev) => ({ ...prev, ...data }));
        if (data.theme) {
          const root = document.documentElement;
          if (data.theme.primary) root.style.setProperty('--pink', data.theme.primary);
          if (data.theme.secondary) root.style.setProperty('--blush', data.theme.secondary);
          if (data.theme.ink) root.style.setProperty('--ink', data.theme.ink);
        }
      })
      .catch(() => {});

    fetch('/api/backgrounds')
      .then((r) => r.json())
      .then((data) => setBackgrounds(data.backgrounds || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      screen === 'camera' || screen === 'loading' || screen === 'result' ? 'hidden' : '';
  }, [screen]);

  function handleSelectLayout(layoutId) {
    const layout = layouts[layoutId];
    setActiveLayout(layout);
    setShots([]);
    setActiveFilter('none');
    setScreen('camera');
  }

  function handleBackToLayouts() {
    sessionStorage.removeItem('pb_screen');
    sessionStorage.removeItem('pb_layout');
    stopCamera(streamRef);
    setShots([]);
    setActiveFilter('none');
    setScreen('layout');
  }

  async function handleAllShotsTaken(capturedShots) {
    const workCanvas = document.querySelector('#workCanvas');
    stopCamera(streamRef);
    setScreen('loading');

    try {
      const blob = await composePhoto(workCanvas, activeLayout, capturedShots);
      const blobUrl = URL.createObjectURL(blob);

      try {
        const result = await uploadPhoto(blob, activeLayout.id);
        setResultData({ blobUrl, downloadUrl: result.downloadUrl, filename: result.filename });
      } catch (uploadErr) {
        console.error('Upload failed:', uploadErr);
        setResultData({ blobUrl, downloadUrl: null, filename: null });
      }
    } catch (err) {
      console.error('Compose failed:', err);
      setResultData({ blobUrl: null, downloadUrl: null, filename: null });
    }

    setScreen('result');
  }

  function handleGifComposing() {
    stopCamera(streamRef);
    setScreen('loading');
  }

  function handleVideoComposing() {
    stopCamera(streamRef);
    setScreen('loading');
  }

  async function handleVideoReady(videoBlob) {
    const blobUrl = URL.createObjectURL(videoBlob);
    try {
      const result = await uploadVideo(videoBlob, activeLayout.id);
      setResultData({ blobUrl, downloadUrl: result.downloadUrl, rawUrl: result.rawUrl, filename: result.filename, isVideo: true });
    } catch (uploadErr) {
      console.error('Video upload failed:', uploadErr);
      setResultData({ blobUrl, downloadUrl: null, filename: null, isVideo: true });
    }
    setScreen('result');
  }

  function handleGifTaken(result) {
    if (result.gifModes) {
      const best = result.gifModes.opt || result.gifModes.high || result.gifModes.med || result.gifModes.low;
      const modeCount = Object.keys(result.gifModes).length;
      setResultData({
        blobUrl: best?.downloadUrl || null,
        downloadUrl: best?.downloadUrl || null,
        filename: best?.filename || null,
        // only pass gifModes to ResultScreen when comparing multiple variants
        gifModes: modeCount > 1 ? result.gifModes : undefined,
      });
    } else {
      setResultData({
        blobUrl: result.downloadUrl,
        downloadUrl: result.downloadUrl,
        filename: result.filename,
      });
    }
    setScreen('result');
  }

  function handleShootAgain() {
    setShots([]);
    setScreen('camera');
  }

  return (
    <main className="app-shell">
      <TopBar />
      {screen === 'layout' && (
        <LayoutScreen
          onSelectLayout={handleSelectLayout}
          onOpenFilterEditor={() => setScreen('filter-editor')}
        />
      )}
      {screen === 'filter-editor' && (
        <FilterEditorScreen onBack={() => setScreen('layout')} />
      )}
      {screen === 'camera' && (
        <CameraScreen
          onAllShotsTaken={handleAllShotsTaken}
          onGifTaken={handleGifTaken}
          onGifComposing={handleGifComposing}
          onVideoReady={handleVideoReady}
          onVideoComposing={handleVideoComposing}
          onBackToLayouts={handleBackToLayouts}
        />
      )}
      {screen === 'loading' && <LoadingScreen />}
      {screen === 'result' && (
        <ResultScreen
          onShootAgain={handleShootAgain}
          onBackToLayouts={handleBackToLayouts}
        />
      )}
    </main>
  );
}
