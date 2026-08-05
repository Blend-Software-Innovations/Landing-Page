// Cart quantity rules, kept pure so they can be tested without a browser.
//
// The storefront has TWO quantity controls for the same line: the number box in
// the order form and the +/- buttons on the cart row. They previously did not
// talk to each other, and because the order summary switches to the cart the
// moment it is non-empty, the number box silently stopped affecting any price —
// it still counted up, but nothing moved, which reads as a broken form.

export type CartLine = {
  id: string;
  name: string;
  productId: string;
  variantId: string;
  optionValues: Record<string, string>;
  quantity: number;
  unitPrice: number;
  weightPerUnit: number;
};

export const MAX_QTY_PER_LINE = 100;

/** Clamp anything a user can get into a number input — blank, negative, 0,
 *  decimal, NaN from a paste — to a sane whole quantity. */
export function normalizeQuantity(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, MAX_QTY_PER_LINE);
}

/** Set (not add) the quantity of one line. Returns the same array reference when
 *  nothing matches, so React can skip a re-render. */
export function setLineQuantity(cart: CartLine[], id: string, quantity: number): CartLine[] {
  if (!cart.some((item) => item.id === id)) return cart;
  const qty = normalizeQuantity(quantity);
  return cart.map((item) => (item.id === id ? { ...item, quantity: qty } : item));
}

/** Add a line, or SET an existing line to the incoming quantity. Set rather than
 *  accumulate: the number box is the source of truth for the current selection,
 *  so pressing "add to cart" twice must not silently double it. */
export function upsertCartLine(cart: CartLine[], incoming: CartLine): CartLine[] {
  const qty = normalizeQuantity(incoming.quantity);
  if (cart.some((item) => item.id === incoming.id)) {
    return cart.map((item) => (item.id === incoming.id ? { ...item, quantity: qty } : item));
  }
  return [...cart, { ...incoming, quantity: qty }];
}

export function removeLine(cart: CartLine[], id: string): CartLine[] {
  return cart.filter((item) => item.id !== id);
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function cartQuantity(cart: CartLine[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}
