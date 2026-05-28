import { useTheme } from "./useTheme";

export const useChartTheme = () => {
  const { isDark } = useTheme();

  return {
    backgroundColor: "transparent",
    textColor: isDark ? "#7A7F96" : "#6B7280",
    gridColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
    tooltipBg: isDark ? "#181C2E" : "#FFFFFF",
    tooltipBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    tooltipText: isDark ? "#F0F2F5" : "#111827",
    colors: isDark
      ? ["#63E4B5", "#7C6FFF", "#FF6B6B", "#FFB347", "#47C9FF", "#FF85C0", "#B4FF6B", "#6BC9FF", "#FFD747"]
      : ["#059669", "#6D5DD3", "#DC2626", "#D97706", "#0284C7", "#DB2777", "#65A30D", "#0891B2", "#CA8A04"],
    incomeColor: isDark ? "#63E4B5" : "#059669",
    expenseColor: isDark ? "#FF6B6B" : "#DC2626",
  };
};

export default useChartTheme;
