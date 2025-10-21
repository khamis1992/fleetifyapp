import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  /** Keyboard key (e.g., 'k', 'f', 'n', 'e') */
  key: string;
  /** Require Ctrl key */
  ctrl?: boolean;
  /** Require Alt key */
  alt?: boolean;
  /** Require Shift key */
  shift?: boolean;
  /** Callback function */
  callback: () => void;
  /** Description for help */
  description: string;
  /** Enable/disable shortcut */
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  /** Array of shortcuts */
  shortcuts?: KeyboardShortcut[];
  /** Enable global shortcuts (Ctrl+K, Ctrl+F, etc.) */
  enableGlobal?: boolean;
  /** Callback for command palette (Ctrl+K) */
  onOpenCommandPalette?: () => void;
  /** Callback for search (Ctrl+F) */
  onOpenSearch?: () => void;
  /** Callback for new item (Ctrl+N) */
  onNewItem?: () => void;
  /** Callback for export (Ctrl+E) */
  onExport?: () => void;
  /** Callback for help (?) */
  onShowHelp?: () => void;
}

export const useKeyboardShortcuts = ({
  shortcuts = [],
  enableGlobal = true,
  onOpenCommandPalette,
  onOpenSearch,
  onNewItem,
  onExport,
  onShowHelp,
}: UseKeyboardShortcutsOptions = {}) => {
  const navigate = useNavigate();
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Special case: Allow Escape to close dialogs even in inputs
      if (event.key === 'Escape') {
        // Trigger escape event for dialog/modal close
        return;
      }

      // Global shortcuts (work even in inputs for some cases)
      if (enableGlobal) {
        // Ctrl+K: Command Palette (works everywhere)
        if (event.ctrlKey && event.key === 'k') {
          event.preventDefault();
          onOpenCommandPalette?.();
          return;
        }

        // Only process other shortcuts if not in input
        if (!isInput) {
          // Ctrl+F: Search
          if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            onOpenSearch?.();
            return;
          }

          // Ctrl+N: New item
          if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            onNewItem?.();
            return;
          }

          // Ctrl+E: Export
          if (event.ctrlKey && event.key === 'e') {
            event.preventDefault();
            onExport?.();
            return;
          }

          // ?: Show help
          if (event.shiftKey && event.key === '?') {
            event.preventDefault();
            onShowHelp?.();
            return;
          }

          // Common navigation shortcuts
          // Ctrl+H: Home
          if (event.ctrlKey && event.key === 'h') {
            event.preventDefault();
            navigate('/');
            return;
          }

          // Ctrl+B: Go back
          if (event.ctrlKey && event.key === 'b') {
            event.preventDefault();
            navigate(-1);
            return;
          }
        }
      }

      // Don't process custom shortcuts if in input
      if (isInput) return;

      // Custom shortcuts
      for (const shortcut of shortcutsRef.current) {
        if (shortcut.enabled === false) continue;

        const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (ctrlMatch && altMatch && shiftMatch && keyMatch) {
          event.preventDefault();
          shortcut.callback();
          return;
        }
      }
    },
    [
      enableGlobal,
      navigate,
      onOpenCommandPalette,
      onOpenSearch,
      onNewItem,
      onExport,
      onShowHelp,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Return all available shortcuts for display
  const getAllShortcuts = useCallback((): KeyboardShortcut[] => {
    const globalShortcuts: KeyboardShortcut[] = [];

    if (enableGlobal) {
      if (onOpenCommandPalette) {
        globalShortcuts.push({
          key: 'k',
          ctrl: true,
          callback: onOpenCommandPalette,
          description: 'فتح لوحة الأوامر',
        });
      }
      if (onOpenSearch) {
        globalShortcuts.push({
          key: 'f',
          ctrl: true,
          callback: onOpenSearch,
          description: 'البحث',
        });
      }
      if (onNewItem) {
        globalShortcuts.push({
          key: 'n',
          ctrl: true,
          callback: onNewItem,
          description: 'إنشاء عنصر جديد',
        });
      }
      if (onExport) {
        globalShortcuts.push({
          key: 'e',
          ctrl: true,
          callback: onExport,
          description: 'تصدير البيانات',
        });
      }
      if (onShowHelp) {
        globalShortcuts.push({
          key: '?',
          shift: true,
          callback: onShowHelp,
          description: 'عرض المساعدة',
        });
      }

      // Navigation shortcuts
      globalShortcuts.push(
        {
          key: 'h',
          ctrl: true,
          callback: () => navigate('/'),
          description: 'الانتقال إلى الصفحة الرئيسية',
        },
        {
          key: 'b',
          ctrl: true,
          callback: () => navigate(-1),
          description: 'الرجوع للصفحة السابقة',
        },
        {
          key: 'Escape',
          callback: () => {},
          description: 'إغلاق النوافذ المنبثقة',
        }
      );
    }

    return [...globalShortcuts, ...shortcuts];
  }, [
    enableGlobal,
    shortcuts,
    navigate,
    onOpenCommandPalette,
    onOpenSearch,
    onNewItem,
    onExport,
    onShowHelp,
  ]);

  return {
    shortcuts: getAllShortcuts(),
  };
};

/**
 * Formats a keyboard shortcut for display
 */
export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const keys: string[] = [];

  if (shortcut.ctrl) keys.push('Ctrl');
  if (shortcut.alt) keys.push('Alt');
  if (shortcut.shift) keys.push('Shift');
  keys.push(shortcut.key.toUpperCase());

  return keys.join(' + ');
};

export default useKeyboardShortcuts;
