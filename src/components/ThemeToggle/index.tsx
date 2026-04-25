"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/Button";
import { normalizeTheme, THEME_COOKIE_NAME, type Theme } from "@/lib/theme";
import styles from "./style.module.css";

const themeListeners = new Set<() => void>();

function getThemeSnapshot(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return normalizeTheme(document.documentElement.dataset.theme);
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
  themeListeners.forEach((listener) => listener());
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  return () => {
    themeListeners.delete(listener);
  };
}

type ThemeToggleProps = {
  initialTheme?: Theme;
};

export function ThemeToggle({ initialTheme = "dark" }: ThemeToggleProps) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => initialTheme,
  );

  function handleToggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";

    applyTheme(nextTheme);
  }

  const isDarkTheme = theme === "dark";

  return (
    <Button
      aria-label={isDarkTheme ? "Alterar para tema claro" : "Alterar para tema escuro"}
      className={styles.button}
      onClick={handleToggleTheme}
      size="icon"
      title={isDarkTheme ? "Alterar para tema claro" : "Alterar para tema escuro"}
      type="button"
    >
      {isDarkTheme ? (
        <Sun aria-hidden="true" className={styles.icon} />
      ) : (
        <Moon aria-hidden="true" className={styles.icon} />
      )}
    </Button>
  );
}
