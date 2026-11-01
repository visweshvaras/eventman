export function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 0,
    }).format(value)}`;
  }
}
