import api from "./api";

export const budgetService = {
  setBudget: (data) => api.put("/budgets", data),
  getBudget: (params) => api.get("/budgets", { params }),
  getBudgetStatus: (params) => api.get("/budgets/status", { params }),
};

export default budgetService;
