import api from "./api";

export const healthService = {
  getHealthScore: (params) => api.get("/health/score", { params }),
  getJunkFoodTrend: () => api.get("/health/trend"),
};
export default healthService;
