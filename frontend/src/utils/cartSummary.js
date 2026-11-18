const eligibleCategories = new Set(['SHIRT', 'HOODIE']);

export function summarizeCartItems(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const eligibleQuantity = items.reduce((sum, item) => {
    return sum + (eligibleCategories.has(String(item.category).toUpperCase())
      ? Number(item.quantity)
      : 0);
  }, 0);
  const roundedSubtotal = Math.round(subtotal * 100) / 100;
  const promotionApplied = eligibleQuantity > 3;
  const discount = promotionApplied ? Math.round(roundedSubtotal * 0.2 * 100) / 100 : 0;
  return {
    subtotal: roundedSubtotal,
    discount,
    total: Math.round((roundedSubtotal - discount) * 100) / 100,
    eligibleQuantity,
    promotionApplied
  };
}
