export const INR = (n: number | string | null | undefined) => {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  if (Number.isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
};

export const CATEGORIES = [
  { key: "food", label: "Food", icon: "🍔", color: "var(--chart-1)" },
  { key: "travel", label: "Travel", icon: "🚌", color: "var(--chart-2)" },
  { key: "rent", label: "Rent", icon: "🏠", color: "var(--chart-3)" },
  { key: "shopping", label: "Shopping", icon: "🛍️", color: "var(--chart-4)" },
  { key: "entertainment", label: "Entertainment", icon: "🎬", color: "var(--chart-5)" },
  { key: "stationery", label: "Stationery", icon: "📚", color: "var(--chart-6)" },
  { key: "misc", label: "Miscellaneous", icon: "✨", color: "var(--chart-7)" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];

export const categoryMeta = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? {
    key,
    label: key,
    icon: "💸",
    color: "var(--chart-7)",
  };
