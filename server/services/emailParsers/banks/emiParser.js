
export const parseEMI = ({ body, subject, date }) => {
  const amountMatch = body.match(/(?:emi|instalment|installment)\s*(?:amount|of)?\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i)
    || body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:emi|instalment|deducted.*loan)/i);

  const loanMatch = body.match(/(?:loan|emi)\s*(?:id|no|number|account)\s*[:\-]?\s*([A-Z0-9]+)/i);
  const loanTypeMatch = body.match(/(?:home loan|car loan|personal loan|education loan|bike loan|vehicle loan|consumer durable|credit card emi)/i);

  if (!amountMatch) return null;

  return {
    source: 'EMI Payment',
    type: 'expense',
    amount: parseFloat(amountMatch[1].replace(/,/g, '')),
    merchant: loanTypeMatch ? `EMI - ${loanTypeMatch[0].trim()}` : 'EMI Payment',
    date: date,
    referenceId: loanMatch ? loanMatch[1] : null,
    category: 'Bills',
    subCategory: null,
    confidence: 85,
    note: `Loan EMI ${loanMatch ? `#${loanMatch[1]}` : ''}`
  };
};
