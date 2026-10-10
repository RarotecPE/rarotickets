export type ColorTheme = "dark" | "light";
export type ApplyColorThemeParams = { theme: ColorTheme };
type ColorThemeListener = () => void;
const THEME_CHANGE_EVENT = "rarotickets:theme-change";
const THEME_STORAGE_KEY = "rarotickets:theme";

export function applyColorTheme(params: ApplyColorThemeParams): void {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("theme-light", params.theme === "light");
    document.body.classList.toggle("theme-light", params.theme === "light");
    document.documentElement.style.colorScheme = params.theme;
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, params.theme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  } catch { /* Storage ou eventos podem estar indisponíveis no navegador. */ }
}

export function getStoredColorTheme(): ColorTheme {
  if (typeof window === "undefined") return "light";
  try { return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light"; } catch { return "light"; }
}

export function getServerColorThemeSnapshot(): ColorTheme {
  return "light";
}

export function subscribeColorTheme(listener: ColorThemeListener): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", listener);
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
  };
}
