import { useEffect } from "react";

export const useKeyboardShortcuts = (handlers = {}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bypasses shortcuts when focusing inside form elements
      const target = e.target;
      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isEditable) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isMetaOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const key = e.key.toLowerCase();

      // Check keyboard matches
      if (isMetaOrCtrl && key === "k") {
        if (handlers.onCmdK) {
          e.preventDefault();
          handlers.onCmdK();
        }
      } else if (isMetaOrCtrl && key === "b") {
        if (handlers.onCmdB) {
          e.preventDefault();
          handlers.onCmdB();
        }
      } else if (e.key === "N") { // Shift+n / n
        if (handlers.onN) {
          e.preventDefault();
          handlers.onN();
        }
      } else if (key === "n" && !e.shiftKey) {
        if (handlers.onN) {
          e.preventDefault();
          handlers.onN();
        }
      } else if (key === "i") {
        if (handlers.onI) {
          e.preventDefault();
          handlers.onI();
        }
      } else if (key === "s") {
        if (handlers.onS) {
          e.preventDefault();
          handlers.onS();
        }
      } else if (e.key === "/") {
        if (handlers.onSlash) {
          e.preventDefault();
          handlers.onSlash();
        }
      } else if (e.key === "Escape") {
        if (handlers.onEsc) {
          e.preventDefault();
          handlers.onEsc();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
};

export default useKeyboardShortcuts;
