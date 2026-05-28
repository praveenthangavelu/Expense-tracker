import api from "./api";

export const popupService = {
  getRandomPopup: () => api.get("/popups/random"),
  getActionPopup: (action, data) =>
    api.get("/popups/action", {
      params: {
        action,
        data: data ? JSON.stringify(data) : undefined,
      },
    }),
  dismissPopup: (popupId) => api.post("/popups/dismiss", { popupId }),
  getLogs: () => api.get("/popups/logs"),
};
