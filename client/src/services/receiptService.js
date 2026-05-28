import api from "./api";

export const receiptService = {
  /**
   * Uploads a receipt image/PDF file to trigger OCR and details extraction.
   * Sets a 30s timeout because OCR can take some time.
   */
  scan: (file) => {
    const formData = new FormData();
    formData.append("receipt", file);

    return api.post("/receipts/scan", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 35000, // 35 seconds timeout for slow OCR
    });
  },

  /**
   * Confirms the extracted data, saves user edits, and creates the transaction.
   */
  confirm: (receiptId, transactionData) =>
    api.post("/receipts/confirm", { receiptId, transactionData }),

  /**
   * Gets a paginated list of user scanned receipts.
   * @param {object} params - pagination and filtering params ({ page, limit, filter })
   */
  getReceipts: (params) => api.get("/receipts", { params }),

  /**
   * Gets details for a single receipt.
   */
  getReceipt: (id) => api.get(`/receipts/${id}`),

  /**
   * Deletes a receipt and its files from disk.
   */
  deleteReceipt: (id) => api.delete(`/receipts/${id}`),

  /**
   * Re-triggers OCR on a failed or poorly parsed receipt image.
   */
  retryOCR: (id) => api.post(`/receipts/${id}/retry`, {}, { timeout: 35000 }),
};

export default receiptService;
