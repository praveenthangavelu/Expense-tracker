import { useTheme as useNextTheme } from "next-themes";
import { useEffect } from "react";

export const useTheme = () => {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const isDark = resolvedTheme === "dark";

  // Sync meta theme-color tag
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isDark ? "#05060B" : "#F5F6F8");
    }
  }, [isDark]);

  return { theme: resolvedTheme, toggleTheme, isDark };
};

export default useTheme;
