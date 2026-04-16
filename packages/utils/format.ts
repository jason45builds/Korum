const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatCurrencyINR = (amount: number) => inrFormatter.format(amount);

export const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
