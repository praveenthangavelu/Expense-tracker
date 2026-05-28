
export const parseCreditCard = ({ body, subject, date }) => {
  const totalDueMatch = body.match(/(?:total amount due|total due|amount payable|minimum due|total outstanding)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);
  const dueDateMatch = body.match(/(?:due date|payment due|pay by|due on)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i)
    || body.match(/(?:due date|payment due)\s*[:\-]?\s*(\d{1,2}\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*\d{2,4})/i);
  const cardMatch = body.match(/(?:card|ending|number)\s*(?:no\.?\s*)?\s*[xX*\.]+(\d{4})/i);

  const transactions = [];
  const txnPattern = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+(.+?)\s+(?:₹|rs\.?|inr)?\s*([\d,]+\.?\d*)\s*(?:dr|cr)?/gi;
  let match;
  while ((match = txnPattern.exec(body)) !== null) {
    transactions.push({
      date: match[1],
      merchant: match[2].trim(),
      amount: parseFloat(match[3].replace(/,/g, '')),
      type: match[0].toLowerCase().includes('cr') ? 'income' : 'expense'
    });
  }

  if (transactions.length > 0) {
    return transactions.map(txn => ({
      source: 'Credit Card Statement',
      type: txn.type,
      amount: txn.amount,
      merchant: txn.merchant,
      date: txn.date,
      category: 'Other',
      paymentMethod: `Card XX${cardMatch ? cardMatch[1] : '****'}`,
      confidence: 75,
      note: 'From credit card statement'
    }));
  }

  if (totalDueMatch) {
    return {
      source: 'Credit Card Bill',
      type: 'expense',
      amount: parseFloat(totalDueMatch[1].replace(/,/g, '')),
      merchant: 'Credit Card Payment',
      date: dueDateMatch ? dueDateMatch[1] : date,
      category: 'Bills',
      paymentMethod: `Card XX${cardMatch ? cardMatch[1] : '****'}`,
      confidence: 85,
      note: 'Credit card bill payment due'
    };
  }

  return null;
};
