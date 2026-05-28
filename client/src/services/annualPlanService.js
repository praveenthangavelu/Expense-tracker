import api from "./api";

export const annualPlanService = {
  getPlan: (params) => api.get("/annual-plan", { params }),
  createPlan: (data) => api.post("/annual-plan", data),
  updateMonth: (month, data, year) => api.put(`/annual-plan/month/${month}`, data, { params: { year } }),
  updateCategoryBudget: (data, year) => api.put("/annual-plan/category", data, { params: { year } }),
  syncActuals: (year) => api.post("/annual-plan/sync", {}, { params: { year } }),
  getAnalysis: (year) => api.get("/annual-plan/analysis", { params: { year } }),
  getRecommendations: (year) => api.get("/annual-plan/recommendations", { params: { year } }),
  linkGoal: (data) => api.post("/annual-plan/link-goal", data),
};

export default annualPlanService;
