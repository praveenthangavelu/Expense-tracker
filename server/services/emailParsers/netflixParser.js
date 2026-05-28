
export const parseNetflix = ({ body, subject, date }) => {
  const result = { source: 'Netflix', type: 'expense', category: 'Entertainment' };
  result.subCategory = 'Subscriptions';

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
  const amountMatch = body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:charged|debited|billed)/i) || subject.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:charged|debited|billed)/i);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0 || amount > 10000000) return null;

  // Extract reference
  const refMatch = body.match(/(?:invoice\s*id\s*[:\-]?\s*)([a-zA-Z0-9\-]+)/i);
  
  result.amount = amount;
  result.merchant = 'Netflix';
  result.date = date;
  result.referenceId = refMatch ? refMatch[1] : null;
  result.note = 'Netflix subscription';
  result.confidence = 85;

  return result;
};
