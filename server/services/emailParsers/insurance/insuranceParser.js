
export const parseInsurance = ({ body, subject, date }) => {
  const amountMatch = body.match(/(?:premium|amount|payment)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);
  const policyMatch = body.match(/(?:policy)\s*(?:no|number|#|id)?\s*[:\-]?\s*([A-Z0-9\/\-]+)/i);
  const typeMatch = body.match(/(?:health insurance|life insurance|motor insurance|car insurance|bike insurance|travel insurance|home insurance|term plan|term insurance)/i);

  if (!amountMatch) return null;

  const insuranceType = typeMatch ? typeMatch[0].trim() : 'Insurance';

  return {
    source: 'Insurance',
    type: 'expense',
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    merchant: insuranceType,
    date: date,
    referenceId: policyMatch ? policyMatch[1] : null,
    category: insuranceType.match(/health/i) ? 'Health' : 'Bills',
    confidence: 85,
    note: `Insurance premium - ${insuranceType}`,
    tags: ['insurance', 'premium']
  };
};
