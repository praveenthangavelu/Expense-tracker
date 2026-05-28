import api from "./api";

export const advisorService = {
  getFullAnalysis: (params) => api.get("/advisor/full", { params }),
  getQuickAdvice: () => api.get("/advisor/quick"),
  getFamilyAnalysis: (params) => api.get("/advisor/family", { params }),
};
export default advisorService;
