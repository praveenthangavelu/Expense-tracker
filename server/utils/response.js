// Standardized response helpers so every controller uses the same shape.
// Centralized here so changing the response envelope only needs one edit.

// 200 OK — successful read or update.
export const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  const response = { success: true, data };
  if (meta.pagination) response.pagination = meta.pagination;
  return res.status(statusCode).json(response);
};

// 201 Created — resource successfully created.
export const sendCreated = (res, data) => {
  return sendSuccess(res, data, 201);
};

// 200 with message — for deletes (204 No Content gives no body, which breaks our success flag convention).
export const sendDeleted = (res, message = "Resource deleted") => {
  return res.status(200).json({ success: true, message });
};
