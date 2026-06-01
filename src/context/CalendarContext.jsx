import { createContext, useContext, useReducer, useEffect } from 'react';
import { minDate, maxDate, daysBetween, addDays } from '../utils/dateUtils';
import { DEFAULT_COLOR } from '../utils/colorPalette';

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

const initialState = {
  blocks: loadBlocks(),
  selectedBlockId: null,
  dragState: {
    mode: 'idle',
    anchorDate: null,
    currentDate: null,
    blockId: null,
    offsetDays: 0,
    previewStart: null,
    previewEnd: null,
  },
  popover: {
    visible: false,
    blockId: null,
    anchorRect: null,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'DRAG_START_CREATE':
      return {
        ...state,
        dragState: {
          mode: 'creating',
          anchorDate: action.anchorDate,
          currentDate: action.anchorDate,
          blockId: null,
          offsetDays: 0,
          previewStart: action.anchorDate,
          previewEnd: action.anchorDate,
        },
      };

    case 'DRAG_START_MOVE': {
      const block = state.blocks.find(b => b.id === action.blockId);
      if (!block) return state;
      return {
        ...state,
        dragState: {
          mode: 'moving',
          anchorDate: null,
          currentDate: action.currentDate,
          blockId: action.blockId,
          offsetDays: action.offsetDays,
          previewStart: block.startDate,
          previewEnd: block.endDate,
        },
      };
    }

    case 'DRAG_UPDATE': {
      const { dragState } = state;
      if (dragState.mode === 'idle') return state;

      if (dragState.mode === 'creating') {
        const previewStart = minDate(dragState.anchorDate, action.currentDate);
        const previewEnd   = maxDate(dragState.anchorDate, action.currentDate);
        return {
          ...state,
          dragState: { ...dragState, currentDate: action.currentDate, previewStart, previewEnd },
        };
      }

      if (dragState.mode === 'moving') {
        const block = state.blocks.find(b => b.id === dragState.blockId);
        if (!block) return state;
        const duration     = daysBetween(block.startDate, block.endDate);
        const previewStart = addDays(action.currentDate, -dragState.offsetDays);
        const previewEnd   = addDays(previewStart, duration);
        return {
          ...state,
          dragState: { ...dragState, currentDate: action.currentDate, previewStart, previewEnd },
        };
      }

      return state;
    }

    case 'DRAG_COMMIT_CREATE': {
      const { dragState } = state;
      if (dragState.mode !== 'creating') return state;
      const newBlock = {
        id: crypto.randomUUID(),
        startDate: dragState.previewStart,
        endDate: dragState.previewEnd,
        color: DEFAULT_COLOR.id,
        label: '',
      };
      return {
        ...state,
        blocks: [...state.blocks, newBlock],
        dragState: { ...initialState.dragState },
        popover: { visible: true, blockId: newBlock.id, anchorRect: action.anchorRect || null },
      };
    }

    case 'DRAG_COMMIT_MOVE': {
      const { dragState } = state;
      if (dragState.mode !== 'moving') return state;
      const blocks = state.blocks.map(b =>
        b.id === dragState.blockId
          ? { ...b, startDate: dragState.previewStart, endDate: dragState.previewEnd }
          : b
      );
      return { ...state, blocks, dragState: { ...initialState.dragState } };
    }

    case 'DRAG_CANCEL':
      return { ...state, dragState: { ...initialState.dragState } };

    case 'BLOCK_UPDATE':
      return {
        ...state,
        blocks: state.blocks.map(b =>
          b.id === action.id ? { ...b, label: action.label, color: action.color } : b
        ),
      };

    case 'SELECT_BLOCK':
      return {
        ...state,
        selectedBlockId: state.selectedBlockId === action.id ? null : action.id,
      };

    case 'BLOCK_DELETE':
      return {
        ...state,
        blocks: state.blocks.filter(b => b.id !== action.id),
        selectedBlockId: state.selectedBlockId === action.id ? null : state.selectedBlockId,
        popover: state.popover.blockId === action.id ? initialState.popover : state.popover,
      };

    case 'POPOVER_OPEN':
      return {
        ...state,
        popover: { visible: true, blockId: action.blockId, anchorRect: action.anchorRect || null },
      };

    case 'POPOVER_CLOSE':
      return { ...state, popover: { ...initialState.popover } };

    default:
      return state;
  }
}

export function CalendarProvider({ children, year }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist blocks
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.blocks));
  }, [state.blocks]);

  return (
    <CalendarContext.Provider value={{ state, dispatch, year }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
