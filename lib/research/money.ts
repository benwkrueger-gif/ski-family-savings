export function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number): string {
  const cents = Math.round(value * 100);
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const dollarPart = dollars.toLocaleString("en-US");
  if (remainder === 0) return `${sign}$${dollarPart}`;
  return `${sign}$${dollarPart}.${remainder.toString().padStart(2, "0")}`;
}

export function formatMoneyRange(low: number, high: number): string {
  const roundedLow = roundCents(low);
  const roundedHigh = roundCents(high);
  if (roundedLow <= 0 && roundedHigh <= 0) return "$0";
  if (roundedLow === roundedHigh) return formatMoney(roundedLow);
  return `${formatMoney(roundedLow)}-${formatMoney(roundedHigh)}`;
}

export function floorDollars(value: number): number {
  if (value <= 0) return 0;
  return Math.floor(roundCents(value));
}

export function formatCustomerMoney(value: number): string {
  return `$${floorDollars(value).toLocaleString("en-US")}`;
}

export function formatCustomerRange(low: number, high: number): string {
  const roundedLow = floorDollars(low);
  const roundedHigh = floorDollars(high);
  if (roundedLow <= 0 && roundedHigh <= 0) return "$0";
  if (roundedLow === roundedHigh) return formatCustomerMoney(low);
  return `${formatCustomerMoney(low)}-${formatCustomerMoney(high)}`;
}

export function displayCostPair(baseline: number, optimized: number): {
  baseline: string;
  optimized: string;
  savings: string;
} {
  const savings = floorDollars(baseline - optimized);
  const optimizedDisplay = Math.round(roundCents(optimized));
  const baselineDisplay = optimizedDisplay + savings;
  return {
    baseline: `$${baselineDisplay.toLocaleString("en-US")}`,
    optimized: `$${optimizedDisplay.toLocaleString("en-US")}`,
    savings: `$${savings.toLocaleString("en-US")}`,
  };
}

export function moneyEquation(baseline: number, optimized: number): {
  baseline: string;
  optimized: string;
  savings: number;
  savingsLabel: string;
  mathNote: string;
} {
  const savings = roundCents(baseline - optimized);
  return {
    baseline: formatMoney(baseline),
    optimized: formatMoney(optimized),
    savings,
    savingsLabel: formatMoney(savings),
    mathNote: `${formatMoney(baseline)} - ${formatMoney(optimized)} = ${formatMoney(savings)}`,
  };
}

export function withVermontTax(preTax: number, rate = 0.06): number {
  return roundCents(preTax * (1 + rate));
}
