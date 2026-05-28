import api from "./api";

export const categorizationService = {
  categorize: (data) => api.post("/categorize", data),
};

export default categorizationService;
