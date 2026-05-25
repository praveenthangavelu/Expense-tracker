import api from "./api";

export const familyService = {
  createFamily: (data) => api.post("/family", data),
  joinFamily: (data) => api.post("/family/join", data),
  leaveFamily: () => api.post("/family/leave"),
  removeMember: (userId) => api.delete(`/family/members/${userId}`),
  transferAdmin: (data) => api.put("/family/transfer-admin", data),
  getFamily: () => api.get("/family"),
  regenerateCode: () => api.post("/family/regenerate-code"),
  getFamilySummary: (params) => api.get("/family/summary", { params }),
  updateSettings: (data) => api.put("/family/settings", data),
};

export default familyService;
