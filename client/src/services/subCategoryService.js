import api from "./api";

export const subCategoryService = {
  getAll: (parentCategory) =>
    api.get("/subcategories", { params: { parentCategory } }),
  create: (data) => api.post("/subcategories", data),
  remove: (id) => api.delete(`/subcategories/${id}`),
};

export default subCategoryService;
