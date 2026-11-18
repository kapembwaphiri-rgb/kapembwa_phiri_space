const eligibleCategories = new Set(['SHIRT', 'HOODIE']);
const promotionThreshold = 3;
const promotionRate = 0.2;

export function calculateDiscount(items) {
  const eligibleQuantity = items.reduce((total, item) => {
    return total + (eligibleCategories.has(String(item.category).toUpperCase())
      ? Number(item.quantity)
      : 0);
  }, 0);
  const subtotal = items.reduce((total, item) => {
    return total + Number(item.price) * Number(item.quantity);
  }, 0);
  const promotionApplied = eligibleQuantity > promotionThreshold;
  const discount = promotionApplied ? Math.round(subtotal * promotionRate * 100) / 100 : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount,
    total: Math.round((subtotal - discount) * 100) / 100,
    eligibleQuantity,
    promotionApplied
  };
}
