// ---------------------------------------------------------------------------------------
// Text normalization for the assistant's NLU.
//
// Everything the parser and the lexicon compare is passed through normalize() first, so
// "الشقّة" / "شقه" / "شقة" all collapse to the same key, and "٣" reads as "3". The rules
// are deliberately lossy — this output is for MATCHING ONLY and is never shown to the
// user (replies are built from templates, not from the normalized input).
// ---------------------------------------------------------------------------------------

const AR_DIGITS = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
}

// Arabic-Indic and Persian digits → ASCII, everywhere in the string.
export function normalizeDigits(s) {
  return String(s ?? '').replace(/[٠-٩۰-۹]/g, (d) => AR_DIGITS[d] ?? d)
}

export function normalize(s) {
  return normalizeDigits(s)
    .toLowerCase()
    // strip tashkeel + tatweel
    .replace(/[ً-ْٰـ]/g, '')
    // unify alef family, alef maqsura, taa marbuta, hamza carriers
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // non-Arabic-script letters occasionally typed by Gulf keyboards
    .replace(/[گڪ]/g, 'ك')
    .replace(/[پ]/g, 'ب')
    .replace(/[چ]/g, 'ج')
    .replace(/[ڤڥ]/g, 'ف')
    // punctuation → space (keeps decimal points inside numbers: 1.5m)
    .replace(/[؟?!،,;:"'()[\]{}<>|/\\_@#%^&*+=~`]/g, ' ')
    .replace(/(\d)\.(\D)/g, '$1 $2')   // "2." before a word is punctuation, not a decimal
    .replace(/-/g, ' - ')              // keep hyphen as its own token (ranges: "1-2 مليون")
    .replace(/\s+/g, ' ')
    .trim()
}

// Language of a USER MESSAGE decides the language of the assistant's reply.
export const isArabicText = (s) => /[؀-ۿ]/.test(String(s ?? ''))

// " مع ال" prefix tolerance: match a token list against text where entries may appear
// with or without the Arabic definite article.
export function stripAl(token) {
  return token.startsWith('ال') && token.length > 4 ? token.slice(2) : token
}
