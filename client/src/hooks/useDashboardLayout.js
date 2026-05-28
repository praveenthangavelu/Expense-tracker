import { useState, useEffect } from "react";

const STORAGE_KEY = "dashboard_sections";

const defaultLayout = {
  foodBreakdown: false,
  healthScore: false,
  goals: false,
};

export const useDashboardLayout = () => {
  const [sections, setSections] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultLayout;
    } catch {
      return defaultLayout;
    }
  });

  const toggleSection = (sectionName) => {
    setSections((prev) => {
      const updated = {
        ...prev,
        [sectionName]: !prev[sectionName],
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to store dashboard sections state", err);
      }
      return updated;
    });
  };

  return { sections, toggleSection };
};

export default useDashboardLayout;
