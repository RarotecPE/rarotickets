"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { HeaderIconButton } from "@/components/header-dropdown";
import { applyColorTheme, getServerColorThemeSnapshot, getStoredColorTheme, subscribeColorTheme } from "@/client/config/color-theme";

export type ThemeToggleProps = { className?: string };

export function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeColorTheme, getStoredColorTheme, getServerColorThemeSnapshot);
  useEffect(() => applyColorTheme({ theme }), [theme]);
  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyColorTheme({ theme: nextTheme });
  }, [theme]);
  return <HeaderIconButton label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"} className={className} onClick={toggleTheme}>{theme === "dark" ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}</HeaderIconButton>;
}
