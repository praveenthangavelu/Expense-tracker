const escapeCell = (value) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export const exportCSV = (transactions, filename = "transactions.csv") => {
  const headers = ["Date", "Type", "Category", "Amount", "Note"];
  const rows = transactions.map((transaction) => [
    new Date(transaction.date).toISOString().slice(0, 10),
    transaction.type,
    transaction.category,
    transaction.amount,
    transaction.note || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
