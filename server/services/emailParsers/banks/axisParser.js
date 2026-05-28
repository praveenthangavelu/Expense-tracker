
export const parseAxisBank = ({ body, subject, date }) => {
  const result = { source: 'Axis Bank', type: 'expense', category: 'Other' };
  

  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();

  // Basic skip check for marketing
  if (subjectLower.match(/offer|discount|deal|coupon|newsletter|sale|promo/i) && !bodyLower.match(/receipt|invoice|confirm|order|bill|paid|payment/i)) {
    return null;
  }

  // Check if subject is relevant
  const relevantMatch = subjectLower.match(/order|payment|invoice|bill|receipt|confirm|recharge|booking|trip|subscription|membership|charged/i);
  if (!relevantMatch) return null;

  // Extract amount
  const amountMatch = body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i) || subject.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0 || amount > 10000000) return null;

  // Extract reference
  const refMatch = body.match(/(?:txn|ref)\s*(?:no|id|#)?\s*[:\-]?\s*([a-zA-Z0-9]+)/i);
  
  result.amount = amount;
  result.merchant = 'Axis Bank';
  result.date = date;
  result.referenceId = refMatch ? refMatch[1] : null;
  result.note = 'Axis transaction';
  result.confidence = 85;

  return result;
};
