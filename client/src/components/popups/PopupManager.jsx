import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { usePopups as usePopupsContext } from "../../context/PopupContext";
import { popupService } from "../../services/popupService";
import SpendingPopup from "./SpendingPopup";
import HealthTipPopup from "./HealthTipPopup";
import BadgePopup from "./BadgePopup";
import LevelUpPopup from "./LevelUpPopup";

export const PopupManager = () => {
  const { activePopup, addPopupToQueue } = usePopupsContext();
  const location = useLocation();
  const timerRef = useRef(null);

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  // Polling logic: 3-8 minutes random delay
  useEffect(() => {
    if (isAuthPage) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const triggerNextPopup = () => {
      const minMs = 30 * 1000;
      const maxMs = 90 * 1000;
      const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

      timerRef.current = setTimeout(async () => {
        if (document.visibilityState === "visible") {
          try {
            const res = await popupService.getRandomPopup();
            if (res?.data) {
              addPopupToQueue(res.data);
            }
          } catch (err) {
            console.error("Failed to load random popup", err);
          }
        }
        // Chain the next timer
        triggerNextPopup();
      }, delay);
    };

    triggerNextPopup();

    // Pause timer when browser tab is inactive
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      } else {
        if (!timerRef.current) {
          triggerNextPopup();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthPage, addPopupToQueue]);

  if (isAuthPage) return null;

  const renderPopup = () => {
    if (!activePopup) return null;

    switch (activePopup.type) {
      case "badge":
        return <BadgePopup key={activePopup.id} popup={activePopup} />;
      case "levelUp":
        return <LevelUpPopup key={activePopup.id} popup={activePopup} />;
      case "health":
        return <HealthTipPopup key={activePopup.id} popup={activePopup} />;
      default:
        return <SpendingPopup key={activePopup.id} popup={activePopup} />;
    }
  };

  return (
    <AnimatePresence>
      {renderPopup()}
    </AnimatePresence>
  );
};

export default PopupManager;
