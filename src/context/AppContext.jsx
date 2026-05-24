import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { layouts, filters, DEFAULT_CONFIG } from '../data/constants.js';

const AppContext = createContext(null);

function restoreScreen() {
  const s = sessionStorage.getItem('pb_screen');
  if (s === 'camera' || s === 'layout') return s;
  if (s === 'loading' || s === 'result') return 'camera';
  return 'layout';
}

function restoreLayout() {
  const id = sessionStorage.getItem('pb_layout');
  return (id && layouts[id]) ? layouts[id] : layouts.frame03;
}

export function AppProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [activeLayout, setActiveLayout] = useState(restoreLayout);
  const [activeFilter, setActiveFilter] = useState('none');
  const [shots, setShots] = useState([]);
  const [facingMode, setFacingMode] = useState('user');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState(restoreScreen);
  const [resultData, setResultData] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const streamRef = useRef(null);

  useEffect(() => { sessionStorage.setItem('pb_screen', screen); }, [screen]);
  useEffect(() => {
    if (activeLayout?.id) sessionStorage.setItem('pb_layout', activeLayout.id);
  }, [activeLayout]);

  return (
    <AppContext.Provider value={{
      config, setConfig,
      activeLayout, setActiveLayout,
      activeFilter, setActiveFilter,
      shots, setShots,
      facingMode, setFacingMode,
      busy, setBusy,
      screen, setScreen,
      resultData, setResultData,
      backgrounds, setBackgrounds,
      streamRef,
      layouts,
      filters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
