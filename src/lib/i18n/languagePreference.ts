export const LANGUAGE_STORAGE_KEY = 'fleetify-language';
const LANGUAGE_SOURCE_KEY = 'fleetify-language-source';

/** Older releases cached the browser language without an explicit user choice. */
export const readLanguagePreference = (storage: Pick<Storage, 'getItem'>): 'ar' | 'en' => {
  try {
    return storage.getItem(LANGUAGE_SOURCE_KEY) === 'user'
      && storage.getItem(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
};

export const saveLanguagePreference = (storage: Pick<Storage, 'setItem'>, language: string): void => {
  try {
    storage.setItem(LANGUAGE_STORAGE_KEY, language);
    storage.setItem(LANGUAGE_SOURCE_KEY, 'user');
  } catch {
    // The chosen language still applies in this session when storage is unavailable.
  }
};
