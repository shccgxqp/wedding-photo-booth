import { createContext, useContext, useRef, useState } from 'react';
import { layouts, frames, filters, DEFAULT_CONFIG } from '../data/constants.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [activeLayout, setActiveLayout] = useState(layouts.strip);
  const [activeFrame, setActiveFrame] = useState('none');
  const [activeFilter, setActiveFilter] = useState('none');
  const [shots, setShots] = useState([]);
  const [facingMode, setFacingMode] = useState('user');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState('layout');
  const [resultData, setResultData] = useState(null);
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBackground, setSelectedBackground] = useState(null);
  const streamRef = useRef(null);

  return (
    <AppContext.Provider value={{
      config, setConfig,
      activeLayout, setActiveLayout,
      activeFrame, setActiveFrame,
      activeFilter, setActiveFilter,
      shots, setShots,
      facingMode, setFacingMode,
      busy, setBusy,
      screen, setScreen,
      resultData, setResultData,
      backgrounds, setBackgrounds,
      selectedBackground, setSelectedBackground,
      streamRef,
      layouts,
      frames,
      filters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
