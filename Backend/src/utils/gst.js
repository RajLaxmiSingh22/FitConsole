const toPaise = (value) => Math.round(Number(value) * 100);

export function getGstRate(environment = process.env) {
  const rate = Number(environment.GST_RATE ?? 18);
  if (!Number.isFinite(rate) || rate < 0 || rate > 28) throw new Error("GST_RATE must be a number between 0 and 28.");
  return rate;
}

// Splits a GST-inclusive amount into taxable value and equal CGST/SGST halves that add back to the total exactly.
export function splitGstInclusive(amount, ratePercent) {
  const total = toPaise(amount);
  const taxable = Math.round(total / (1 + ratePercent / 100));
  const tax = total - taxable;
  const cgst = Math.round(tax / 2);
  return { taxable: taxable / 100, cgst: cgst / 100, sgst: (tax - cgst) / 100, total: total / 100 };
}

export function formatInvoiceNumber(invoiceNumber) {
  return `FC-${String(invoiceNumber).padStart(6, "0")}`;
}
