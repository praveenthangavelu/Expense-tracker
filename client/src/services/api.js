import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("expenseflow_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      "Something went wrong";

    if (status === 401) {
      localStorage.removeItem("expenseflow_token");
      localStorage.removeItem("expenseflow_user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    throw { message, status, errors: error.response?.data?.errors || [] };
  },
);

export default api;
