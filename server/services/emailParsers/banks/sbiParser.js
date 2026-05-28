
import { parseCreditCard } from './creditCardParser.js';

export const parseSBI = ({ body, subject, date }) => {
  const result = { source: 'SBI', date };

  if (subject.match(/credit|salary|neft|imps|upi.*credit|amount.*credited/i) || body.match(/credited/i)) {
    const amountMatch = body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:has been|is|was)?\s*credited/i)
      || body.match(/credited.*?(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);

    const senderMatch = body.match(/(?:from|sender|remitter|by)\s*[:\-]?\s*(.+?)(?:\n|<|$|\s{2,})/i);
    const refMatch = body.match(/(?:ref|utr|txn|transaction)\s*(?:no|id|#)?\s*[:\-]?\s*([A-Z0-9]+)/i);
    const accountMatch = body.match(/(?:a\/c|acct?|account)\s*(?:no\.?\s*)?\s*[xX*\.]+(\d{4})/i);

    result.type = 'income';
    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.referenceId = refMatch ? refMatch[1] : null;
    result.accountNumber = accountMatch ? accountMatch[1] : null;

    if (subject.match(/salary/i) || body.match(/salary|payroll|neft.*(?:company|employer|pvt|ltd|inc)/i)) {
      result.category = 'Salary';
      result.merchant = senderMatch ? senderMatch[1].trim() : 'Salary Credit';
    } else {
      result.category = 'Other';
      result.merchant = senderMatch ? senderMatch[1].trim() : 'Bank Credit';
      result.note = 'Money received';
    }

    result.confidence = result.amount ? 85 : 30;
  }
  else if (subject.match(/debit|transaction|payment|debited|spent/i) || body.match(/debited/i)) {
    const amountMatch = body.match(/(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)\s*(?:has been|is|was)?\s*debited/i)
      || body.match(/debited.*?(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);

    const merchantMatch = body.match(/(?:to|towards|at|merchant|payee)\s*[:\-]?\s*(.+?)(?:\n|<|$|\s{2,})/i);
    const refMatch = body.match(/(?:ref|utr|txn|transaction)\s*(?:no|id|#)?\s*[:\-]?\s*([A-Z0-9]+)/i);

    result.type = 'expense';
    result.amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null;
    result.merchant = merchantMatch ? merchantMatch[1].trim() : 'Bank Debit';
    result.referenceId = refMatch ? refMatch[1] : null;
    result.category = 'Other';
    result.confidence = result.amount ? 80 : 30;
  }
  else if (subject.match(/credit card|card statement|statement.*card/i)) {
    return parseCreditCard({ body, subject, date });
  }
  else {
    return null;
  }

  return result;
};
