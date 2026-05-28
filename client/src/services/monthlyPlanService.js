import api from "./api";

export const monthlyPlanService = {
  getPlan: (params) => api.get("/monthly-plan", { params }),
  createPlan: (data) => api.post("/monthly-plan", data),
  updateBudget: (data, params) => api.put("/monthly-plan/budget", data, { params }),
  addRule: (data, params) => api.post("/monthly-plan/rules", data, { params }),
  getRebalance: (params) => api.get("/monthly-plan/rebalance", { params }),
  applyRebalance: (data, params) => api.post("/monthly-plan/rebalance/apply", data, { params }),
  getWeeklyReport: (params) => api.get("/monthly-plan/weekly-report", { params }),
  getMonthEndReport: (params) => api.get("/monthly-plan/month-end-report", { params }),
};

export default monthlyPlanService;
