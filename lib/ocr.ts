import { OcrResult } from '../types';

const VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY!;
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
const VISION_PDF_URL = `https://vision.googleapis.com/v1/files:annotate?key=${VISION_API_KEY}`;

/**
 * Unified entry point — routes to the correct Vision API endpoint
 * based on mime type (image vs PDF).
 */
export async function scanReceiptFile(base64: string, mimeType: string): Promise<OcrResult> {
  if (mimeType === 'application/pdf') {
    return scanReceiptPdf(base64);
  }
  return scanReceiptBase64(base64);
}

/**
 * Scan a PDF receipt using the Vision files:annotate endpoint (up to 5 pages).
 */
async function scanReceiptPdf(base64Pdf: string): Promise<OcrResult> {
  if (!VISION_API_KEY || VISION_API_KEY === 'YOUR_GOOGLE_VISION_API_KEY_HERE') {
    throw new Error('Google Vision API key is not configured.');
  }

  const requestBody = {
    requests: [{
      inputConfig: {
        content: base64Pdf,
        mimeType: 'application/pdf',
      },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      pages: [1, 2], // first two pages is enough for a receipt
    }],
  };

  const response = await fetch(VISION_PDF_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vision API (PDF) error ${response.status}: ${body}`);
  }

  const json = await response.json();

  if (json?.responses?.[0]?.error) {
    const err = json.responses[0].error;
    throw new Error(`Vision API: ${err.message ?? err.code}`);
  }

  // PDF response nests results differently — collect text from all pages
  const pageResponses: any[] = json?.responses?.[0]?.responses ?? [];
  const fullText = pageResponses
    .map((p: any) => p?.fullTextAnnotation?.text ?? '')
    .join('\n');

  if (!fullText) {
    return { amount: null, currency: 'EUR', merchantName: null, date: null, rawText: '' };
  }

  return parseReceiptText(fullText);
}

/**
 * Call Google Cloud Vision API with a base64-encoded JPEG.
 * Returns parsed receipt fields (amount, date, merchant).
 */
export async function scanReceiptBase64(base64Image: string): Promise<OcrResult> {
  if (!VISION_API_KEY || VISION_API_KEY === 'YOUR_GOOGLE_VISION_API_KEY_HERE') {
    throw new Error('Google Vision API key is not configured. Please add EXPO_PUBLIC_GOOGLE_VISION_API_KEY to your .env file.');
  }

  const requestBody = {
    requests: [
      {
        image: { content: base64Image },
        features: [
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
      },
    ],
  };

  const response = await fetch(VISION_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vision API error ${response.status}: ${body}`);
  }

  const json = await response.json();

  // Check for API-level errors in the response body
  if (json?.responses?.[0]?.error) {
    const err = json.responses[0].error;
    throw new Error(`Vision API: ${err.message ?? err.code}`);
  }

  const fullText: string =
    json?.responses?.[0]?.fullTextAnnotation?.text ??
    json?.responses?.[0]?.textAnnotations?.[0]?.description ??
    '';

  if (!fullText) {
    // Return empty result rather than throwing — form will just be blank
    return { amount: null, currency: 'EUR', merchantName: null, date: null, rawText: '' };
  }

  return parseReceiptText(fullText);
}

/**
 * Parse raw OCR text from a receipt into structured fields.
 * Tuned for European receipts (EUR default, DD/MM/YYYY dates, comma decimals).
 */
export function parseReceiptText(rawText: string): OcrResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    amount: extractAmount(rawText),
    currency: extractCurrency(rawText),
    merchantName: extractMerchant(lines),
    date: extractDate(rawText),
    rawText,
  };
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

function extractAmount(text: string): number | null {
  // Normalise: replace € symbol so we can match amounts near it
  const normalised = text.replace(/€/g, '€ ');

  // Priority 1: lines with total/amount keywords
  const totalPatterns = [
    /(?:total|totaal|betrag|montant|importe|somme|subtotal|grand\s*total)[^\d]*(\d{1,4}[.,]\d{2})/gi,
    /(\d{1,4}[.,]\d{2})\s*(?:total|totaal)/gi,
  ];

  for (const pattern of totalPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    const matches: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(normalised)) !== null) {
      const val = parseAmount(match[1]);
      if (val !== null) matches.push(val);
    }
    if (matches.length > 0) return Math.max(...matches);
  }

  // Priority 2: amount near € symbol
  const euroPattern = /€\s*(\d{1,4}[.,]\d{2})|(\d{1,4}[.,]\d{2})\s*€/g;
  const euroMatches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = euroPattern.exec(normalised)) !== null) {
    const raw = m[1] ?? m[2];
    const val = parseAmount(raw);
    if (val !== null) euroMatches.push(val);
  }
  if (euroMatches.length > 0) return Math.max(...euroMatches);

  // Priority 3: any decimal number (pick largest — most likely the total)
  const anyNumber = /(\d{1,4}[.,]\d{2})/g;
  const allMatches: number[] = [];
  while ((m = anyNumber.exec(text)) !== null) {
    const val = parseAmount(m[1]);
    if (val !== null && val > 0 && val < 100000) allMatches.push(val);
  }
  if (allMatches.length === 0) return null;
  return Math.max(...allMatches);
}

/** Parse a raw string like "12,34" or "12.34" to a float */
function parseAmount(raw: string): number | null {
  // European format: comma as decimal separator (12,34)
  // International: dot as decimal separator (12.34)
  // Distinguish: if there's only one separator and it's followed by exactly 2 digits → decimal
  const normalised = raw.replace(',', '.');
  const val = parseFloat(normalised);
  return isNaN(val) ? null : val;
}

function extractCurrency(text: string): string {
  const currencyPatterns: Record<string, RegExp> = {
    EUR: /€|EUR/i,
    GBP: /£|GBP/i,
    CHF: /CHF|Fr\./i,
    AED: /AED|د\.إ/i,
    CAD: /CAD|C\$/i,
    AUD: /AUD|A\$/i,
    USD: /\$|USD/i,
  };

  for (const [code, pattern] of Object.entries(currencyPatterns)) {
    if (pattern.test(text)) return code;
  }
  return 'EUR'; // default to EUR for Icos Capital
}

function extractMerchant(lines: string[]): string | null {
  // Merchant name is typically in the first few lines
  // Skip lines that are purely numbers, dates, phone numbers, addresses, or very short
  const skipPatterns = [
    /^\d/,                          // starts with digit
    /receipt|invoice|order|tax|vat|btw|kvk|btw-nr/i,
    /^\W+$/,                        // only punctuation
    /\d{2}[\/\-]\d{2}[\/\-]\d{2,4}/, // date-like
    /\+?\d[\d\s\-\(\)]{6,}/,       // phone number
    /^(the|de|het|een|a|an)\s/i,    // articles
  ];

  for (const line of lines.slice(0, 8)) {
    if (line.length < 3) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;
    return line;
  }
  return null;
}

function extractDate(text: string): string | null {
  // European format: DD/MM/YYYY or DD-MM-YYYY (try first)
  const europeanDate = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/;
  // ISO format: YYYY-MM-DD
  const isoDate = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/;
  // Written month: "12 Jan 2024" or "Jan 12, 2024" or "12 januari 2024"
  const writtenMonthDE = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|Mai|Mai|Jun|Jul|Aug|Sep|Okt|Nov|Dez|Mrt|Apr|Mei|Okt)[a-z]*\.?\s+(\d{4})\b/i;
  const writtenMonthEN = /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})\b/i;
  const writtenMonthENRev = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i;

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', mrt: '03', apr: '04', may: '05', mei: '05',
    jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', okt: '10',
    nov: '11', dec: '12', mai: '05',
  };

  // Try ISO first (unambiguous)
  let match = isoDate.exec(text);
  if (match) {
    const y = match[1], mo = match[2].padStart(2, '0'), d = match[3].padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  // Try written month (EN reversed: "Jan 12, 2024")
  match = writtenMonthENRev.exec(text);
  if (match) {
    const monthKey = match[1].toLowerCase().slice(0, 3);
    const month = monthMap[monthKey];
    if (month) {
      const d = match[2].padStart(2, '0'), y = match[3];
      return `${y}-${month}-${d}`;
    }
  }

  // Try written month (DE/NL: "12 Jan 2024")
  match = writtenMonthDE.exec(text) ?? writtenMonthEN.exec(text);
  if (match) {
    const monthKey = match[2].toLowerCase().slice(0, 3);
    const month = monthMap[monthKey];
    if (month) {
      const d = match[1].padStart(2, '0'), y = match[3];
      return `${y}-${month}-${d}`;
    }
  }

  // European numeric: DD/MM/YYYY — treat first segment as day
  match = europeanDate.exec(text);
  if (match) {
    const d = match[1].padStart(2, '0');
    const mo = match[2].padStart(2, '0');
    const y = match[3];
    // Sanity check: day 1-31, month 1-12
    if (parseInt(d) <= 31 && parseInt(mo) <= 12) {
      return `${y}-${mo}-${d}`;
    }
  }

  return null;
}
