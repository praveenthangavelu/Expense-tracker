import api from "./api";

export const getGoogleUrl = () => api.get("/google/url");

export const connectGoogle = (code) => api.post("/google/connect", { code });

export const disconnectGoogle = () => api.post("/google/disconnect");

export const triggerScan = () => api.post("/google/scan");

export const getLogs = () => api.get("/google/logs");

export const getDrafts = () => api.get("/google/drafts");

export const confirmDraft = (id) => api.post(`/google/drafts/${id}/confirm`);

export const updateDraft = (id, data) => api.put(`/google/drafts/${id}`, data);

export const rejectDraft = (id) => api.delete(`/google/drafts/${id}`);

export const updatePreferences = (prefs) => api.post("/google/preferences", prefs);

export const addExcludedSender = (email) => api.post("/google/excluded-senders", { email });

export const removeExcludedSender = (email) => api.delete("/google/excluded-senders", { data: { email } });

export const getNotifications = () => api.get("/notifications");

export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.patch("/notifications/read-all");

export default {
  getGoogleUrl,
  connectGoogle,
  disconnectGoogle,
  triggerScan,
  getLogs,
  getDrafts,
  confirmDraft,
  updateDraft,
  rejectDraft,
  updatePreferences,
  addExcludedSender,
  removeExcludedSender,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
