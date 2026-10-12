import { useCallback, useEffect, useState } from "react";

const THEME_KEY = "dashboard-theme";

function readTheme() {
  return localStorage.getItem(THEME_KEY) === "dark";
}

function useDashboardTheme() {
  const [isDark, setIsDark] = useState(readTheme);

  useEffect(() => {
    const syncTheme = (event) => {
      if (event.key === THEME_KEY) setIsDark(event.newValue === "dark");
    };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const nextIsDark = !readTheme();
    localStorage.setItem(THEME_KEY, nextIsDark ? "dark" : "light");
    setIsDark(nextIsDark);
  }, []);

  return { isDark, toggleTheme };
}

export default useDashboardTheme;
