import { endOfMonth, formatISO, startOfMonth } from "date-fns";

import api from "./api";

export const transactionService = {
  getAll: (params) => api.get("/transactions", { params }),
  create: (data) => api.post("/transactions", data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  remove: (id) => api.delete(`/transactions/${id}`),
  getSummary: (params) => api.get("/transactions/summary", { params }),
  getAllForMonth: (month, year) => {
    const monthDate = new Date(year, month - 1, 1);

    return api.get("/transactions", {
      params: {
        startDate: formatISO(startOfMonth(monthDate)),
        endDate: formatISO(endOfMonth(monthDate)),
        limit: 1000,
      },
    });
  },
};

export const categoryService = {
  getAll: () => api.get("/categories"),
  create: (data) => api.post("/categories", data),
  remove: (id) => api.delete(`/categories/${id}`),
};
