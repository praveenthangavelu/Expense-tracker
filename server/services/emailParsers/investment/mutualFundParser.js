
export const parseMutualFund = ({ body, subject, date }) => {
  if (subject.match(/sip|purchase|allotment|investment|mutual fund/i)) {
    const amountMatch = body.match(/(?:amount|invested|sip amount|purchase amount)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);
    const fundMatch = body.match(/(?:scheme|fund|plan)\s*(?:name)?\s*[:\-]?\s*(.+?)(?:\n|<|$)/i);
    const folioMatch = body.match(/(?:folio)\s*(?:no|number|#)?\s*[:\-]?\s*([A-Z0-9\/]+)/i);

    if (!amountMatch) return null;

    return {
      source: 'Mutual Fund',
      type: 'expense',
      amount: parseFloat(amountMatch[1].replace(/,/g, '')),
      merchant: fundMatch ? fundMatch[1].trim().substring(0, 50) : 'Mutual Fund SIP',
      date: date,
      referenceId: folioMatch ? folioMatch[1] : null,
      category: 'Other',
      subCategory: null,
      confidence: 85,
      note: 'Investment - Mutual Fund SIP',
      tags: ['investment', 'sip']
    };
  }

  if (subject.match(/redeem|redemption|withdrawal/i)) {
    const amountMatch = body.match(/(?:amount|redeemed|credited)\s*[:\-]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i);

    return amountMatch ? {
      source: 'Mutual Fund Redemption',
      type: 'income',
      amount: parseFloat(amountMatch[1].replace(/,/g, '')),
      merchant: 'Mutual Fund Redemption',
      date: date,
      category: 'Other',
      confidence: 80,
      note: 'Investment - Mutual Fund Redemption',
      tags: ['investment', 'redemption']
    } : null;
  }

  return null;
};
