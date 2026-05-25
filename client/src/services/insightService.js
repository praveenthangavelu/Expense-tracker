import api from "./api";

export const insightService = {
  getInsights: (params) => api.get("/insights", { params }),
  getFamilyInsights: (params) => api.get("/insights/family", { params }),
};

export default insightService;
