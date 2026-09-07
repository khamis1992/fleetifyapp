import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANGUAGE, FALLBACK_LANGUAGE, i18n, initializeI18n, TRANSLATION_NAMESPACES } from '@/lib/i18n/config';
import { readLanguagePreference, saveLanguagePreference } from '@/lib/i18n/languagePreference';

describe('official Arabic application language', () => {
  it('starts in Arabic on an English browser even with an old cached English locale', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');
    localStorage.setItem('fleetify-language', 'en');
    await initializeI18n();

    expect(DEFAULT_LANGUAGE).toBe('ar');
    expect(FALLBACK_LANGUAGE).toBe('ar');
    expect(i18n.resolvedLanguage).toBe('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.body.style.direction).toBe('rtl');
    expect(localStorage.getItem('fleetify-language')).toBe('ar');
    for (const namespace of Object.values(TRANSLATION_NAMESPACES)) {
      expect(i18n.hasResourceBundle('ar', namespace), namespace).toBe(true);
    }
    expect(i18n.t('fleetify', { ns: 'ui' })).toBe('فليتيفاي');
    expect(i18n.t('workspace.title', { ns: 'financial' })).toMatch(/[\u0600-\u06ff]/);
    vi.restoreAllMocks();
  });

  it('defaults new sessions and legacy preferences to Arabic', () => {
    expect(readLanguagePreference(localStorage)).toBe('ar');
    localStorage.setItem('fleetify-language', 'en');
    expect(readLanguagePreference(localStorage)).toBe('ar');
  });

  it('preserves a deliberate later language selection across reloads', () => {
    saveLanguagePreference(localStorage, 'en');
    expect(readLanguagePreference(localStorage)).toBe('en');
    saveLanguagePreference(localStorage, 'ar');
    expect(readLanguagePreference(localStorage)).toBe('ar');
  });

  it('uses Arabic when storage is blocked or the language has no resources', () => {
    saveLanguagePreference(localStorage, 'fr');
    expect(readLanguagePreference(localStorage)).toBe('ar');
    expect(readLanguagePreference({ getItem: () => { throw new Error('Storage blocked'); } })).toBe('ar');
  });
});
