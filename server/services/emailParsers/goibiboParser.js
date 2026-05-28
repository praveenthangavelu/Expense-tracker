
export const parseGoibibo = ({ body, subject, date }) => {
  const result = { source: 'Goibibo', type: 'expense', category: 'Transport' };
  result.subCategory = 'Travel';

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
  const amountMatch = body.match(/(?:total amount|amount paid|total)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i) || subject.match(/(?:total amount|amount paid|total)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0 || amount > 10000000) return null;

  // Extract reference
  const refMatch = body.match(/(?:booking\s*id\s*[:\-]?\s*)([a-zA-Z0-9\-]+)/i);
  
  result.amount = amount;
  result.merchant = 'Goibibo';
  result.date = date;
  result.referenceId = refMatch ? refMatch[1] : null;
  result.note = 'Goibibo booking';
  result.confidence = 85;

  return result;
};
