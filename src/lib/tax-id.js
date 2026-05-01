/**
 * Tax ID format validators for each supported country.
 * Returns true if the ID matches the expected format for that country.
 * "OTHER" countries are always accepted (we can't validate unknown formats).
 */
const VALIDATORS = {
  // US: Employer Identification Number — 9 digits, optionally formatted as XX-XXXXXXX
  US: (id) => /^\d{2}-?\d{7}$/.test(id),

  // UK: Companies House number — 8 chars: either 8 digits or 2-letter prefix + 6 digits
  GB: (id) => /^([A-Z]{2}\d{6}|\d{8})$/i.test(id),

  // Canada: Business Number — 9 digits (program accounts like RT, RP follow but aren't required here)
  CA: (id) => /^\d{9}$/.test(id.replace(/\s/g, '')),

  // Australia: ABN — 11 digits
  AU: (id) => /^\d{11}$/.test(id.replace(/\s/g, '')),

  // Germany: Umsatzsteuer-Identifikationsnummer — DE followed by 9 digits
  DE: (id) => /^DE\d{9}$/i.test(id.replace(/\s/g, '')),

  // France: SIRET — 14 digits
  FR: (id) => /^\d{14}$/.test(id.replace(/\s/g, '')),

  // Netherlands: RSIN — 9 digits
  NL: (id) => /^\d{9}$/.test(id.replace(/\s/g, '')),

  // Singapore: UEN — 9 or 10 alphanumeric characters ending in a letter
  SG: (id) => /^[0-9A-Z]{8,9}[A-Z]$/i.test(id.replace(/\s/g, '')),

  // UAE: TRN — 15 digits
  AE: (id) => /^\d{15}$/.test(id.replace(/\s/g, '')),

  // Unknown country — accept any non-empty value
  OTHER: () => true,
};

/**
 * Returns 'verified' if the tax ID passes format validation for the given country,
 * or 'pending' if it doesn't match the expected pattern (manual review needed).
 */
export function resolveVerificationStatus(taxId, country) {
  const raw = taxId?.trim() ?? '';
  if (!raw) return 'pending';
  const validate = VALIDATORS[country] ?? VALIDATORS.OTHER;
  return validate(raw) ? 'verified' : 'pending';
}
