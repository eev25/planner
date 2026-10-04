import { createContext, useContext, useReducer, useEffect } from 'react';
import { reducer, initialState } from './calendarReducer';

const CalendarContext = createContext(null);

const STORAGE_KEY = 'calendar-blocks-v1';

function loadBlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CalendarProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, s => ({ ...s, blocks: loadBlocks() }));

  // Persist blocks
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.blocks));
  }, [state.blocks]);

  return (
    <CalendarContext.Provider value={{ state, dispatch }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
