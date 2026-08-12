// Acento de marca de GestorIA.

export type AccentKey = "gestoria";

export interface AccentTheme {
  key: AccentKey;
  label: string;
  description: string;
  red: string;
  dark: string;
  swatch: string;
}

export const ACCENT_THEMES: AccentTheme[] = [
  {
    key: "gestoria",
    label: "Lima GestorIA",
    description: "La paleta oficial de GestorIA.",
    red: "197 237 27",
    dark: "168 204 18",
    swatch: "#C5ED1B",
  },
];

export const DEFAULT_ACCENT: AccentKey = "gestoria";
export const ACCENT_STORAGE_KEY = "panel-accent";

export function applyAccent(key: string): void {
  const theme = ACCENT_THEMES.find((t) => t.key === key) ?? ACCENT_THEMES[0];
  const root = document.documentElement.style;
  root.setProperty("--brand-red", theme.red);
  root.setProperty("--brand-dark", theme.dark);
}

export function buildAccentScript(): string {
  const map = Object.fromEntries(ACCENT_THEMES.map((t) => [t.key, [t.red, t.dark]]));
  return `(function(){try{var m=${JSON.stringify(map)};var k=localStorage.getItem(${JSON.stringify(
    ACCENT_STORAGE_KEY
  )})||${JSON.stringify(DEFAULT_ACCENT)};var v=m[k];if(v){var s=document.documentElement.style;s.setProperty('--brand-red',v[0]);s.setProperty('--brand-dark',v[1]);}}catch(e){}})();`;
}
