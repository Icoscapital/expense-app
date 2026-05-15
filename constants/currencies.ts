/**
 * Single source of truth for supported currencies.
 *
 * To add a currency: append an entry here. AmountInput, the picker, and the
 * OCR currency detector all consume this list — no other files need changing.
 *
 * `ocrPattern` matches the currency code OR its written symbol(s) inside the
 * raw OCR text from a receipt. Order in this array also controls picker order.
 */
export interface CurrencyDef {
  code: string;       // ISO 4217 (e.g. 'EUR', 'SGD')
  symbol: string;     // Display symbol (e.g. '€', 'S$')
  name: string;       // Human name (e.g. 'Singapore Dollar')
  ocrPattern: RegExp; // Used by lib/ocr.ts to detect currency from receipt text
}

export const CURRENCIES: CurrencyDef[] = [
  // ─── Icos primary (kept first for default UX) ───────────────────────────
  { code: 'EUR', symbol: '€',   name: 'Euro',                ocrPattern: /€|EUR\b/i },
  { code: 'USD', symbol: '$',   name: 'US Dollar',           ocrPattern: /\bUSD\b|US\$/i },
  { code: 'GBP', symbol: '£',   name: 'British Pound',       ocrPattern: /£|GBP\b/i },
  { code: 'CHF', symbol: 'Fr',  name: 'Swiss Franc',         ocrPattern: /CHF\b|Fr\./i },

  // ─── Asia-Pacific ───────────────────────────────────────────────────────
  { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar',    ocrPattern: /\bSGD\b|S\$/i },
  { code: 'JPY', symbol: '¥',   name: 'Japanese Yen',        ocrPattern: /\bJPY\b|円/i },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',        ocrPattern: /\bCNY\b|RMB\b|元/i },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar',    ocrPattern: /\bHKD\b|HK\$/i },
  { code: 'KRW', symbol: '₩',   name: 'South Korean Won',    ocrPattern: /\bKRW\b|₩/i },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',        ocrPattern: /\bINR\b|₹|Rs\.?/i },
  { code: 'THB', symbol: '฿',   name: 'Thai Baht',           ocrPattern: /\bTHB\b|฿/i },
  { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit',   ocrPattern: /\bMYR\b|RM\s?\d/i },
  { code: 'IDR', symbol: 'Rp',  name: 'Indonesian Rupiah',   ocrPattern: /\bIDR\b|Rp\s?\d/i },
  { code: 'PHP', symbol: '₱',   name: 'Philippine Peso',     ocrPattern: /\bPHP\b|₱/i },
  { code: 'VND', symbol: '₫',   name: 'Vietnamese Dong',     ocrPattern: /\bVND\b|₫/i },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar',       ocrPattern: /\bTWD\b|NT\$/i },
  { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar',   ocrPattern: /\bAUD\b|A\$/i },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar',  ocrPattern: /\bNZD\b|NZ\$/i },

  // ─── Middle East ────────────────────────────────────────────────────────
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',          ocrPattern: /\bAED\b|د\.إ/i },
  { code: 'SAR', symbol: 'SR',  name: 'Saudi Riyal',         ocrPattern: /\bSAR\b|﷼/i },
  { code: 'QAR', symbol: 'QR',  name: 'Qatari Riyal',        ocrPattern: /\bQAR\b/i },
  { code: 'ILS', symbol: '₪',   name: 'Israeli Shekel',      ocrPattern: /\bILS\b|₪/i },
  { code: 'TRY', symbol: '₺',   name: 'Turkish Lira',        ocrPattern: /\bTRY\b|₺/i },

  // ─── Europe (non-EUR) ──────────────────────────────────────────────────
  { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone',     ocrPattern: /\bNOK\b/i },
  { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona',       ocrPattern: /\bSEK\b/i },
  { code: 'DKK', symbol: 'kr',  name: 'Danish Krone',        ocrPattern: /\bDKK\b/i },
  { code: 'PLN', symbol: 'zł',  name: 'Polish Złoty',        ocrPattern: /\bPLN\b|zł/i },
  { code: 'CZK', symbol: 'Kč',  name: 'Czech Koruna',        ocrPattern: /\bCZK\b|Kč/i },
  { code: 'HUF', symbol: 'Ft',  name: 'Hungarian Forint',    ocrPattern: /\bHUF\b|Ft\b/i },

  // ─── Americas ──────────────────────────────────────────────────────────
  { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar',     ocrPattern: /\bCAD\b|C\$/i },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso',       ocrPattern: /\bMXN\b|Mex\$/i },
  { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real',      ocrPattern: /\bBRL\b|R\$/i },

  // ─── Africa ────────────────────────────────────────────────────────────
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand',  ocrPattern: /\bZAR\b/i },
];

/** Map of code → CurrencyDef for O(1) lookup */
export const CURRENCY_BY_CODE: Record<string, CurrencyDef> = Object.fromEntries(
  CURRENCIES.map(c => [c.code, c])
);

/** Returns the display symbol for a currency code (falls back to the code itself) */
export function currencySymbol(code: string): string {
  return CURRENCY_BY_CODE[code]?.symbol ?? code;
}
