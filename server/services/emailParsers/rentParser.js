
export const parseRentPayment = ({ body, subject, date }) => {
  const amountMatch = body.match(/(?:rent|amount|payment)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i)
    || body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:rent|towards rent|monthly rent)/i);

  const landlordMatch = body.match(/(?:landlord|owner|to|paid to)\s*[:\-]?\s*(.+?)(?:\n|<|$)/i);
  const propertyMatch = body.match(/(?:property|flat|house|apartment|address)\s*[:\-]?\s*(.+?)(?:\n|<|$)/i);
  const receiptMatch = body.match(/(?:receipt)\s*(?:no|number|#|id)?\s*[:\-]?\s*([A-Z0-9\-]+)/i);

  if (!amountMatch) return null;

  return {
    source: 'Rent Payment',
    type: 'expense',
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    merchant: landlordMatch ? `Rent - ${landlordMatch[1].trim()}` : 'Rent Payment',
    date: date,
    referenceId: receiptMatch ? receiptMatch[1] : null,
    category: 'Rent',
    confidence: 85,
    note: propertyMatch ? `Rent for ${propertyMatch[1].trim()}` : 'Monthly rent'
  };
};
