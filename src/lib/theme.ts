export type Theme = "light" | "dark";

export const THEME_COOKIE_NAME = "crypto-wallet-theme";

export function normalizeTheme(theme?: string): Theme {
  return theme === "light" ? "light" : "dark";
}
