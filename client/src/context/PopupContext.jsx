import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { popupService } from "../services/popupService";
import { useAuth } from "./AuthContext";

/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */

const PopupContext = createContext(null);

export const PopupProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [queue, setQueue] = useState([]);
  const [activePopup, setActivePopup] = useState(null);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("expenseflow_popups_muted") === "true";
  });
  const [sessionCount, setSessionCount] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const lastDismissedTimeRef = useRef(0);

  // Play pop sound via Web Audio API synth
  const playPopSound = useCallback(() => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(450, audioCtx.currentTime); // Pitch start
      osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.08); // Slide down

      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch {
      // Ignored if user hasn't interacted with page yet
    }
  }, [isMuted]);

  // Queue transition helper
  useEffect(() => {
    if (!isAuthenticated) {
      setQueue((prev) => (prev.length > 0 ? [] : prev));
      setActivePopup((prev) => (prev ? null : prev));
      return;
    }

    if (activePopup || queue.length === 0 || transitioning) return;

    setTransitioning(true);

    const timeSinceLastDismiss = Date.now() - lastDismissedTimeRef.current;
    const delay = timeSinceLastDismiss < 2000 ? 2000 - timeSinceLastDismiss : 0;

    const timer = setTimeout(() => {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      setActivePopup(next);
      setTransitioning(false);
      playPopSound();
    }, delay);

    return () => clearTimeout(timer);
  }, [activePopup, queue, transitioning, isAuthenticated, playPopSound]);

  const addPopupToQueue = useCallback((popup) => {
    if (!popup) return;
    
    setSessionCount((count) => {
      if (count >= 10) {
        return count; // Cap exceeded, discard popup
      }
      
      setQueue((prev) => {
        // Prevent adding duplicate popups to queue
        if (prev.some((p) => p.id === popup.id)) return prev;
        return [...prev, popup];
      });

      return count + 1;
    });
  }, []);

  const triggerActionPopup = useCallback(async (action, data) => {
    if (!isAuthenticated) return;
    try {
      const res = await popupService.getActionPopup(action, data);
      if (res?.data) {
        addPopupToQueue(res.data);
      }
    } catch (err) {
      console.error("Failed to trigger action popup", err);
    }
  }, [isAuthenticated, addPopupToQueue]);

  const dismissPopup = useCallback(async (popupId) => {
    lastDismissedTimeRef.current = Date.now();

    // If it's a temp/local health tip, we don't need backend dismissal, else call backend
    if (popupId && !popupId.startsWith("temp_")) {
      try {
        await popupService.dismissPopup(popupId);
      } catch (err) {
        console.error("Failed to dismiss popup on backend", err);
      }
    }

    setActivePopup(null);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setActivePopup(null);
  }, []);

  const mutePopups = useCallback(() => {
    setIsMuted(true);
    localStorage.setItem("expenseflow_popups_muted", "true");
  }, []);

  const unmutePopups = useCallback(() => {
    setIsMuted(false);
    localStorage.setItem("expenseflow_popups_muted", "false");
  }, []);

  return (
    <PopupContext.Provider
      value={{
        queue,
        activePopup,
        isMuted,
        sessionCount,
        triggerActionPopup,
        addPopupToQueue,
        dismissPopup,
        clearQueue,
        mutePopups,
        unmutePopups,
      }}
    >
      {children}
    </PopupContext.Provider>
  );
};

export const usePopups = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopups must be used inside PopupProvider");
  }
  return context;
};
export default PopupContext;
