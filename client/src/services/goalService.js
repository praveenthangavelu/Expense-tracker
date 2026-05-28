import api from "./api";

export const goalService = {
  getAll: (params) => api.get("/goals", { params }),
  create: (data) => api.post("/goals", data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  addSavings: (id, data) => api.post(`/goals/${id}/add`, data),
  withdrawSavings: (id, data) => api.post(`/goals/${id}/withdraw`, data),
  pauseResume: (id) => api.patch(`/goals/${id}/pause-resume`),
  remove: (id) => api.delete(`/goals/${id}`),
  getRecommendations: () => api.get("/goals/recommendations"),
  getInsights: () => api.get("/goals/insights"),
};

export default goalService;
