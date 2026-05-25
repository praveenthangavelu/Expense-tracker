import api from "./api";

export const recurringService = {
  getAll: () => api.get("/recurring"),
  create: (data) => api.post("/recurring", data),
  update: (id, data) => api.put(`/recurring/${id}`, data),
  remove: (id) => api.delete(`/recurring/${id}`),
  toggleActive: (id) => api.patch(`/recurring/${id}/toggle`),
};

export default recurringService;
