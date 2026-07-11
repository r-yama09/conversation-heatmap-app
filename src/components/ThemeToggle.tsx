"use client";

import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const storageKey = "conversation-heatmap-theme";

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference === "system" ? getSystemTheme() : preference;
}

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    let storedPreference: ThemePreference = "system";
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "system" || stored === "light" || stored === "dark") storedPreference = stored;
    } catch {
      // localStorage が無効でもシステム設定を安全に利用する。
    }

    const timer = window.setTimeout(() => setPreference(storedPreference), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    applyTheme(preference);
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (preference === "system") applyTheme("system");
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [preference]);

  function selectTheme(nextPreference: ThemePreference) {
    setPreference(nextPreference);
    applyTheme(nextPreference);
    try {
      window.localStorage.setItem(storageKey, nextPreference);
    } catch {
      // 保存できない環境でも、現在のページでは選択を反映する。
    }
  }

  return <div className="theme-toggle" role="group" aria-label="表示テーマ">
    {([ ["system", "システム"], ["light", "ライト"], ["dark", "ダーク"] ] as const).map(([value, label]) => <button key={value} type="button" className="theme-toggle-button" aria-pressed={preference === value} onClick={() => selectTheme(value)}>{label}</button>)}
  </div>;
}
