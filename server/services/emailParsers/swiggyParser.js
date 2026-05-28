
export const parseSwiggy = ({ body, subject, date }) => {
  if (!subject.match(/order|delivered|receipt|invoice/i)) return null;

  const amountMatch = body.match(/(?:total paid|bill total|grand total|total|amount)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i)
    || body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);

  const restaurantMatch = body.match(/(?:from|restaurant|ordered from)\s*[:\-]?\s*(.+?)(?:\n|<|$)/i);
  const orderIdMatch = body.match(/(?:order\s*(?:id|#|no)?)\s*[:\-]?\s*([A-Z0-9\-]+)/i);

  const bodyLower = body.toLowerCase();
  let subCategory = 'Online Food Delivery';
  let isJunk = false;
  if (bodyLower.match(/pizza|burger|fries|fried|mcdonald|kfc|domino|coke|pepsi/)) {
    isJunk = true;
  }

  return {
    source: 'Swiggy',
    type: 'expense',
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    merchant: restaurantMatch ? `Swiggy - ${restaurantMatch[1].trim()}` : 'Swiggy',
    date: date,
    referenceId: orderIdMatch ? orderIdMatch[1] : null,
    category: 'Food',
    subCategory: subCategory,
    isJunk: isJunk,
    confidence: amountMatch ? 90 : 35,
  };
};
