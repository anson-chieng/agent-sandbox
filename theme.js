export const STORAGE_KEY = 'theme';
export const THEMES = ['light', 'dark'];

const DARK_QUERY = '(prefers-color-scheme: dark)';

const isTheme = (value) => THEMES.includes(value);

/** Returns the stored theme, or null if absent, invalid, or storage is unavailable. */
export function readStoredTheme(storage) {
  try {
    const value = storage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/** Persists the theme. Returns false (never throws) if storage is unavailable. */
export function writeStoredTheme(storage, theme) {
  try {
    storage.setItem(STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function getSystemTheme(matchMedia) {
  try {
    return matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

/** Stored choice wins; otherwise follow the OS. */
export function resolveInitialTheme(storage, matchMedia) {
  return readStoredTheme(storage) ?? getSystemTheme(matchMedia);
}

export function otherTheme(theme) {
  return theme === 'dark' ? 'light' : 'dark';
}

/** Applies the theme to <html> and, if given, syncs the toggle button. */
export function applyTheme(theme, root, button) {
  root.setAttribute('data-theme', theme);
  root.style.setProperty('color-scheme', theme);
  if (button) {
    const next = otherTheme(theme);
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    button.setAttribute('title', `Switch to ${next} mode`);
  }
}

/**
 * Wires the toggle button and OS-preference listener.
 * Returns the controller (`getTheme`, `toggle`, `destroy`).
 */
export function initThemeToggle({
  button,
  root = document.documentElement,
  storage = window.localStorage,
  matchMedia = window.matchMedia.bind(window),
}) {
  let theme = resolveInitialTheme(storage, matchMedia);
  // Remembers a click even if the write failed, so OS changes don't override it.
  let chosenThisSession = false;
  applyTheme(theme, root, button);

  const toggle = () => {
    theme = otherTheme(theme);
    chosenThisSession = true;
    writeStoredTheme(storage, theme);
    applyTheme(theme, root, button);
  };

  const onSystemChange = () => {
    if (chosenThisSession || readStoredTheme(storage) !== null) return;
    theme = getSystemTheme(matchMedia);
    applyTheme(theme, root, button);
  };

  let mql = null;
  try {
    mql = matchMedia(DARK_QUERY);
    mql.addEventListener('change', onSystemChange);
  } catch {
    mql = null;
  }
  button.addEventListener('click', toggle);

  return {
    getTheme: () => theme,
    toggle,
    destroy() {
      button.removeEventListener('click', toggle);
      mql?.removeEventListener('change', onSystemChange);
    },
  };
}

if (typeof document !== 'undefined') {
  const button = document.getElementById('theme-toggle');
  if (button) initThemeToggle({ button });
}
