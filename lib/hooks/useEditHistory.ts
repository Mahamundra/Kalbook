import { useState, useCallback, useRef } from 'react';
import type { Settings } from '@/lib/types/admin';

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  settings: Settings;
  timestamp: number;
}

export function useEditHistory(initialSettings: Settings) {
  const [history, setHistory] = useState<HistoryState[]>([
    { settings: JSON.parse(JSON.stringify(initialSettings)), timestamp: Date.now() }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoingRef = useRef(false);

  const getCurrentSettings = useCallback((): Settings => {
    return history[currentIndex]?.settings || initialSettings;
  }, [history, currentIndex, initialSettings]);

  const pushToHistory = useCallback((newSettings: Settings) => {
    // If we're in the middle of history (not at the end), remove future history
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // Add new state
      const newState: HistoryState = {
        settings: JSON.parse(JSON.stringify(newSettings)),
        timestamp: Date.now()
      };
      
      // Limit history size
      const updatedHistory = [...newHistory, newState];
      if (updatedHistory.length > MAX_HISTORY_SIZE) {
        return updatedHistory.slice(-MAX_HISTORY_SIZE);
      }
      
      return updatedHistory;
    });
    
    setCurrentIndex((prev) => {
      const newIndex = Math.min(prev + 1, MAX_HISTORY_SIZE - 1);
      return newIndex;
    });
  }, [currentIndex]);

  const undo = useCallback((): Settings | null => {
    if (currentIndex > 0) {
      isUndoingRef.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 0);
      return history[newIndex]?.settings || null;
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback((): Settings | null => {
    if (currentIndex < history.length - 1) {
      isUndoingRef.current = true;
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setTimeout(() => {
        isUndoingRef.current = false;
      }, 0);
      return history[newIndex]?.settings || null;
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const reset = useCallback((settings: Settings) => {
    setHistory([{ settings: JSON.parse(JSON.stringify(settings)), timestamp: Date.now() }]);
    setCurrentIndex(0);
  }, []);

  return {
    currentSettings: getCurrentSettings(),
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    isUndoing: () => isUndoingRef.current
  };
}





