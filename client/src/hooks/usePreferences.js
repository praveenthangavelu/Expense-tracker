import { useEffect, useState } from "react";

const STORAGE_KEY = "expenseflow_preferences";

const defaultPreferences = {
  showDecimals: false,
  groupByDate: true,
  defaultType: "expense",
};

export const usePreferences = () => {
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  return { preferences, setPreferences, updatePreference };
};
