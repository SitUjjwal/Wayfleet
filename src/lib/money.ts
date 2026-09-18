export function formatMinorUnits(
  amount: number,
  currency = "INR",
  locale = "en-IN",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function rupeesToMinorUnits(rupees: number): number {
  return Math.round(rupees) * 100;
}

export function minorUnitsToRupees(amount: number): number {
  return amount / 100;
}
