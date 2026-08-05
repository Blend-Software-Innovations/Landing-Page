// Persist the in-progress order form so a refresh (or an accidental back swipe,
// which is easy to do one-handed on a phone) does not wipe everything the buyer
// typed. The cart already survived a reload; the customer details did not, so a
// reload dropped them back to an empty form with a full cart.
//
// Stored on the buyer's own device only, and cleared as soon as the order is
// placed. Payment fields are deliberately excluded — a transaction id and a
// paid amount belong to one attempt and must not be silently replayed into the
// next one.

const DRAFT_KEY = "order_draft_v1";
const EXCLUDED = new Set(["transactionId", "paidAmount", "paymentProof"]);

export type OrderDraft = {
  fields: Record<string, string>;
  district?: string;
  thana?: string;
  deliverySlot?: string;
  courierPartner?: string;
  quantity?: number;
};

export function loadDraft(): OrderDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const fields =
      parsed.fields && typeof parsed.fields === "object" && !Array.isArray(parsed.fields) ? parsed.fields : {};
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (EXCLUDED.has(key)) continue;
      if (typeof value === "string") clean[key] = value.slice(0, 500);
    }
    return {
      fields: clean,
      district: typeof parsed.district === "string" ? parsed.district : undefined,
      thana: typeof parsed.thana === "string" ? parsed.thana : undefined,
      deliverySlot: typeof parsed.deliverySlot === "string" ? parsed.deliverySlot : undefined,
      courierPartner: typeof parsed.courierPartner === "string" ? parsed.courierPartner : undefined,
      quantity: Number.isFinite(parsed.quantity) ? Number(parsed.quantity) : undefined
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: OrderDraft) {
  if (typeof window === "undefined") return;
  try {
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(draft.fields || {})) {
      if (EXCLUDED.has(key) || typeof value !== "string" || !value) continue;
      fields[key] = value.slice(0, 500);
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, fields }));
  } catch {
    // Storage can be full or disabled (private mode) — losing the draft is not
    // worth breaking checkout over.
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

/** Read the text fields out of a form element, skipping files and payment data. */
export function collectFields(form: HTMLFormElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (EXCLUDED.has(key) || typeof value !== "string") continue;
    out[key] = value;
  }
  return out;
}
