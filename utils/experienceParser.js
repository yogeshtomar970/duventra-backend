// utils/experienceParser.js
// ✅ Adzuna "experience required" ka koi structured field nahi deta.
// Ye title + description me common patterns dhoondh kar best-effort
// experience bucket nikaalta hai — 100% accurate nahi hoga, par filter
// ke liye kaafi useful hai. Kuch nahi milta to "unspecified".

// "2-5 years", "3+ yrs", "1 to 3 years" jaise patterns
const RANGE_RE = /(\d{1,2})\s*(?:-|to|\+)\s*(\d{1,2})?\s*(?:years?|yrs?)/i;
const PLUS_RE = /(\d{1,2})\s*\+\s*(?:years?|yrs?)/i;
const FRESHER_WORDS = /\b(fresher|entry[\s-]?level|no experience|0\s*(?:years?|yrs?)|graduate trainee|intern)\b/i;

export const bucketFromYears = (min, max) => {
  const lo = min ?? 0;
  const hi = max ?? min ?? 0;
  if (hi <= 0) return "fresher";
  if (hi <= 2) return "0-2";
  if (hi <= 5) return "2-5";
  return "5+";
};

// Return: { experienceLevel, experienceLabel }
export const parseExperience = (title = "", description = "") => {
  const text = `${title} ${description}`;

  const plusMatch = text.match(PLUS_RE);
  if (plusMatch) {
    const years = parseInt(plusMatch[1], 10);
    return {
      experienceLevel: years >= 5 ? "5+" : bucketFromYears(years, years),
      experienceLabel: `${years}+ years`,
    };
  }

  const rangeMatch = text.match(RANGE_RE);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : min;
    return {
      experienceLevel: bucketFromYears(min, max),
      experienceLabel: max && max !== min ? `${min}-${max} years` : `${min} years`,
    };
  }

  if (FRESHER_WORDS.test(text)) {
    return { experienceLevel: "fresher", experienceLabel: "Fresher / 0 years" };
  }

  return { experienceLevel: "unspecified", experienceLabel: "" };
};