/**
 * تحسينات إمكانية الوصول للتطبيق المتجاوب
 * يوفر أدوات ومساعدات لتحسين تجربة المستخدمين ذوي الاحتياجات الخاصة
 */

import { useEffect, useCallback, useState } from 'react';

// إعدادات إمكانية الوصول
export interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  colorBlindFriendly: boolean;
  rtlSupport: boolean;
}

// الإعدادات الافتراضية
const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: true,
  focusVisible: true,
  colorBlindFriendly: false,
  rtlSupport: true
};

/**
 * خطاف إدارة إعدادات إمكانية الوصول
 */
export const useAccessibilitySettings = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accessibility-settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }
    return defaultSettings;
  });

  // حفظ الإعدادات
  const saveSettings = useCallback((newSettings: Partial<AccessibilitySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessibility-settings', JSON.stringify(updated));
    }
  }, [settings]);

  // تطبيق الإعدادات على DOM
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // التباين العالي
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // النص الكبير
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // تقليل الحركة
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // دعم قارئ الشاشة
    if (settings.screenReader) {
      root.classList.add('screen-reader-optimized');
    } else {
      root.classList.remove('screen-reader-optimized');
    }

    // التنقل بلوحة المفاتيح
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }

    // مؤشرات التركيز المرئية
    if (settings.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }

    // دعم عمى الألوان
    if (settings.colorBlindFriendly) {
      root.classList.add('color-blind-friendly');
    } else {
      root.classList.remove('color-blind-friendly');
    }

    // دعم RTL
    if (settings.rtlSupport) {
      root.setAttribute('dir', 'rtl');
    } else {
      root.setAttribute('dir', 'ltr');
    }

  }, [settings]);

  return { settings, saveSettings };
};

/**
 * كشف تفضيلات النظام لإمكانية الوصول
 */
export const detectSystemPreferences = (): Partial<AccessibilitySettings> => {
  if (typeof window === 'undefined') return {};

  const preferences: Partial<AccessibilitySettings> = {};

  // كشف تفضيل تقليل الحركة
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    preferences.reducedMotion = true;
  }

  // كشف تفضيل التباين العالي
  if (window.matchMedia('(prefers-contrast: high)').matches) {
    preferences.highContrast = true;
  }

  // كشف استخدام قارئ الشاشة
  if ('speechSynthesis' in window || navigator.userAgent.includes('NVDA') || navigator.userAgent.includes('JAWS')) {
    preferences.screenReader = true;
  }

  return preferences;
};

/**
 * مساعدات التنقل بلوحة المفاتيح
 */
export const useKeyboardNavigation = () => {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // إضافة مؤشرات التركيز
  const addFocusRing = useCallback((element: HTMLElement) => {
    if (isKeyboardUser) {
      element.classList.add('focus-ring');
    }
  }, [isKeyboardUser]);

  // إزالة مؤشرات التركيز
  const removeFocusRing = useCallback((element: HTMLElement) => {
    element.classList.remove('focus-ring');
  }, []);

  return { isKeyboardUser, addFocusRing, removeFocusRing };
};

/**
 * مساعدات قارئ الشاشة
 */
export const useScreenReaderAnnouncements = () => {
  const [announcer, setAnnouncer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // إنشاء عنصر الإعلانات
    const announcerElement = document.createElement('div');
    announcerElement.setAttribute('aria-live', 'polite');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.className = 'sr-only';
    announcerElement.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    
    document.body.appendChild(announcerElement);
    setAnnouncer(announcerElement);

    return () => {
      if (document.body.contains(announcerElement)) {
        document.body.removeChild(announcerElement);
      }
    };
  }, []);

  // إعلان رسالة لقارئ الشاشة
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcer) return;

    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;

    // مسح الرسالة بعد فترة
    setTimeout(() => {
      if (announcer) {
        announcer.textContent = '';
      }
    }, 1000);
  }, [announcer]);

  return { announce };
};

/**
 * تحسين التباين اللوني
 */
export const calculateColorContrast = (foreground: string, background: string): number => {
  // تحويل الألوان إلى RGB
  const getRGB = (color: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [0, 0, 0];
    
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  };

  // حساب اللمعان النسبي
  const getLuminance = ([r, g, b]: number[]) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fgRGB = getRGB(foreground);
  const bgRGB = getRGB(background);
  
  const fgLuminance = getLuminance(fgRGB);
  const bgLuminance = getLuminance(bgRGB);
  
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * التحقق من مستوى التباين
 */
export const checkContrastCompliance = (contrast: number, level: 'AA' | 'AAA' = 'AA', size: 'normal' | 'large' = 'normal') => {
  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 }
  };
  
  return contrast >= requirements[level][size];
};

/**
 * مساعدات ARIA
 */
export const ariaHelpers = {
  // تحديث تسمية ARIA
  updateAriaLabel: (element: HTMLElement, label: string) => {
    element.setAttribute('aria-label', label);
  },

  // تحديث وصف ARIA
  updateAriaDescription: (element: HTMLElement, description: string) => {
    const descId = `desc-${Math.random().toString(36).substr(2, 9)}`;
    
    let descElement = document.getElementById(descId);
    if (!descElement) {
      descElement = document.createElement('div');
      descElement.id = descId;
      descElement.className = 'sr-only';
      document.body.appendChild(descElement);
    }
    
    descElement.textContent = description;
    element.setAttribute('aria-describedby', descId);
  },

  // تحديث حالة ARIA
  updateAriaState: (element: HTMLElement, state: string, value: string | boolean) => {
    element.setAttribute(`aria-${state}`, value.toString());
  },

  // إضافة دور ARIA
  addAriaRole: (element: HTMLElement, role: string) => {
    element.setAttribute('role', role);
  },

  // إضافة خصائص ARIA للجداول
  enhanceTableAccessibility: (table: HTMLTableElement) => {
    table.setAttribute('role', 'table');
    
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
      header.setAttribute('scope', 'col');
      header.id = `header-${index}`;
    });
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach((row, rowIndex) => {
      row.setAttribute('role', 'row');
      
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, cellIndex) => {
        cell.setAttribute('role', 'cell');
        const correspondingHeader = headers[cellIndex];
        if (correspondingHeader) {
          cell.setAttribute('aria-describedby', correspondingHeader.id);
        }
      });
    });
  },

  // إضافة خصائص ARIA للنماذج
  enhanceFormAccessibility: (form: HTMLFormElement) => {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const label = form.querySelector(`label[for="${input.id}"]`);
      if (!label && !input.getAttribute('aria-label')) {
        const placeholder = input.getAttribute('placeholder');
        if (placeholder) {
          input.setAttribute('aria-label', placeholder);
        }
      }
      
      // إضافة رسائل الخطأ
      const errorElement = form.querySelector(`[data-error-for="${input.id}"]`);
      if (errorElement) {
        input.setAttribute('aria-describedby', errorElement.id);
        input.setAttribute('aria-invalid', 'true');
      }
    });
  }
};

/**
 * مكون مساعد لإعدادات إمكانية الوصول
 */
export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useAccessibilitySettings();
  const { announce } = useScreenReaderAnnouncements();

  useEffect(() => {
    // كشف التفضيلات التلقائية عند التحميل الأول
    const systemPrefs = detectSystemPreferences();
    if (Object.keys(systemPrefs).length > 0) {
      announce('تم تطبيق إعدادات إمكانية الوصول التلقائية');
    }
  }, [announce]);

  return <>{children}</>;
};

export default {
  useAccessibilitySettings,
  detectSystemPreferences,
  useKeyboardNavigation,
  useScreenReaderAnnouncements,
  calculateColorContrast,
  checkContrastCompliance,
  ariaHelpers,
  AccessibilityProvider
};
