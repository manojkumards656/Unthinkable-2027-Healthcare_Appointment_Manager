export interface AnonymizationResult {
  anonymizedText: string;
  scrubMap: Map<string, string>;
}

export function anonymizeForLLM(
  text: string,
  patientInfo?: { name?: string; email?: string; phone?: string; dob?: string }
): AnonymizationResult {
  let anonymized = text || '';
  const scrubMap = new Map<string, string>();

  // 1. Remove patient name if provided
  if (patientInfo?.name) {
    const nameParts = patientInfo.name.split(/\s+/);
    for (const part of nameParts) {
      if (part.length > 2) {
        anonymized = anonymized.replace(new RegExp(part, 'gi'), '[PATIENT]');
        scrubMap.set(part, '[PATIENT]');
      }
    }
  }

  // 2. Remove email patterns
  anonymized = anonymized.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[EMAIL_REDACTED]');

  // 3. Remove phone numbers (US / International & Indian formats)
  anonymized = anonymized.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');
  anonymized = anonymized.replace(/(\+91|0)?[-\s]?[6-9]\d{9}/g, '[PHONE_REDACTED]');

  // 4. Remove date-of-birth patterns (DD/MM/YYYY, MM-DD-YYYY, etc.)
  anonymized = anonymized.replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, '[DATE_REDACTED]');

  // 5. Remove Aadhaar numbers (Indian ID: 12 digits with or without spaces)
  anonymized = anonymized.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[ID_REDACTED]');

  // 6. Remove UUID-like strings (internal IDs)
  anonymized = anonymized.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '[ID_REDACTED]'
  );

  return { anonymizedText: anonymized, scrubMap };
}
