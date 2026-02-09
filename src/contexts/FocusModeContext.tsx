import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface FocusModeContextType {
  active: boolean;
  toggle: () => void;
  activate: () => void;
  deactivate: () => void;
}

const FOCUS_STORAGE_KEY = 'systemFocusModeActive';

const FocusModeContext = createContext<FocusModeContextType>({
  active: false,
  toggle: () => {},
  activate: () => {},
  deactivate: () => {},
});

export function useFocusModeContext() {
  return useContext(FocusModeContext);
}

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(() => {
    try {
      const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        // Only restore if same day
        if (data.date === new Date().toISOString().split('T')[0]) {
          return data.active === true;
        }
      }
    } catch { /* ignore */ }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify({
      active,
      date: new Date().toISOString().split('T')[0],
    }));
  }, [active]);

  const toggle = useCallback(() => setActive(prev => !prev), []);
  const activate = useCallback(() => setActive(true), []);
  const deactivate = useCallback(() => setActive(false), []);

  return (
    <FocusModeContext.Provider value={{ active, toggle, activate, deactivate }}>
      {children}
    </FocusModeContext.Provider>
  );
}
