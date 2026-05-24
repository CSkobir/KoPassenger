import validator from "validator";

/** Trim and escape HTML entities on string fields (defense in depth). */
export function sanitizeString(value, maxLength = 5000) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, maxLength);
  return validator.escape(trimmed);
}

/** Trim only — for names (Unicode-safe; UI escapes on render). */
export function sanitizePlainText(value, maxLength = 5000) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").trim().slice(0, maxLength);
}

export function sanitizeEmail(value) {
  if (typeof value !== "string") return "";
  const t = value.trim().toLowerCase();
  const n = validator.normalizeEmail(t, { gmail_remove_dots: false });
  return n === false ? t : n;
}

export function sanitizeBodyStrings(obj, keys) {
  const out = { ...obj };
  for (const k of keys) {
    if (out[k] !== undefined && typeof out[k] === "string") {
      out[k] = sanitizeString(out[k]);
    }
  }
  return out;
}
