import api from "./api";

export const authService = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
  updateSettings: (data) => api.put("/auth/settings", data),
  getGoogleLoginUrl: () => api.get("/auth/google/url"),
  loginWithGoogle: (code) => api.post("/auth/google/callback", { code }),
};
