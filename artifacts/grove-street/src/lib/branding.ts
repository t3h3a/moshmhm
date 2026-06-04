export const LOGO_SRC = "/images/logo/logo.png";
export const AD_IMAGES = [
  "/images/ads/a3lan1.png",
  "/images/ads/a3lan2.png",
  "/images/ads/a3lan3.png",
];

export const CURRENCY_LABEL = "د.أ";
export const ORANGE_MONEY_NUMBER = "0791517855";
export const ORANGE_MONEY_INSTRUCTIONS =
  "حوّل المبلغ عبر Orange Money إلى الرقم 0791517855 ثم أرسل إثبات الدفع أو رقم العملية وسيتم مراجعة الإيداع من الإدارة";

export function formatCurrency(value: number | string | null | undefined) {
  const numeric = typeof value === "number" ? value.toFixed(2) : value ?? "0";
  return `${numeric} ${CURRENCY_LABEL}`;
}
