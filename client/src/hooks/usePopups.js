import { usePopups as usePopupsContext } from "../context/PopupContext";

export const usePopups = () => {
  const context = usePopupsContext();
  return {
    triggerActionPopup: context.triggerActionPopup,
    addPopupToQueue: context.addPopupToQueue,
    dismissPopup: context.dismissPopup,
    clearQueue: context.clearQueue,
    mutePopups: context.mutePopups,
    unmutePopups: context.unmutePopups,
    isMuted: context.isMuted,
  };
};

export default usePopups;
