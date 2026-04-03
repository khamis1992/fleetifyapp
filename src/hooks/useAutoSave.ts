import { useEffect, useRef } from "react";

export function useAutoSave(data: Record<string, unknown>, key: string, interval = 30000) {
  const lastSaveRef = useRef<string>("");

  useEffect(() => {
    const current = JSON.stringify(data);
    if (current === lastSaveRef.current) return;

    const timer = setTimeout(() => {
      if (current !== lastSaveRef.current) {
        localStorage.setItem(`autosave-${key}`, current);
        lastSaveRef.current = current;
      }
    }, interval);

    return () => clearTimeout(timer);
  }, [data, key, interval]);

  const loadDraft = () => {
    const saved = localStorage.getItem(`autosave-${key}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  };

  const clearDraft = () => {
    localStorage.removeItem(`autosave-${key}`);
    lastSaveRef.current = "";
  };

  return { loadDraft, clearDraft };
}