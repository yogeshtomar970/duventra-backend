// utils/externalJobsSync.js
// ✅ Ye function Adzuna se actual data laata hai aur MongoDB (ExternalJob)
// me upsert karta hai. Ye sirf cron se (ya server start par ek baar) chalta
// hai — normal frontend requests iska istemal nahi karti, wo seedha DB read
// karti hain (controllers/externalJobsController.js).
import ExternalJob from "../models/externalJobModel.js";
import { parseExperience } from "./experienceParser.js";

const ADZUNA_COUNTRY = "in";
const RESULTS_PER_CITY = 20;
const MAX_DESCRIPTION_CHARS = 1500;

// ✅ Ab sirf 2 categories — "job" (fresher + graduate combine) aur "internship"
// NOTE: Adzuna ka "what" param pure string ko literal phrase treat karta
// hai — "graduate OR fresher" bhejne par wo literally "OR" word wali jobs
// dhoondhta hai (jo ~0 results deta hai). OR-matching ke liye Adzuna ka
// alag "what_or" param chahiye (space-separated keywords, kisi ek se bhi
// match ho to job aa jaati hai).
const CATEGORY_KEYWORDS = {
  job: ["graduate", "fresher", "entry-level"],
  internship: ["internship"],
};

const DEFAULT_CITIES = ["Delhi", "Noida", "Gurgaon"];

const truncate = (text, max) => {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
};

const employmentTypeLabel = (job) => {
  const parts = [];
  if (job.contract_time === "full_time") parts.push("Full-time");
  else if (job.contract_time === "part_time") parts.push("Part-time");
  if (job.contract_type === "permanent") parts.push("Permanent");
  else if (job.contract_type === "contract") parts.push("Contract");
  return parts.length > 0 ? parts.join(" · ") : "N/A";
};

const payStatusFor = (minSalary, maxSalary) => {
  if ((minSalary && minSalary > 0) || (maxSalary && maxSalary > 0)) return "paid";
  return "unpaid";
};

const callAdzuna = async (category, city) => {
  const keywords = CATEGORY_KEYWORDS[category];

  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID,
    app_key: process.env.ADZUNA_APP_KEY,
    where: city,
    results_per_page: String(RESULTS_PER_CITY),
    sort_by: "date",
    "content-type": "application/json",
  });

  // ✅ Multiple keywords → "what_or" (OR match, kisi ek word se match ho
  // jaaye). Single keyword → normal "what" (AND / phrase match) use karo.
  if (keywords.length > 1) {
    params.set("what_or", keywords.join(" "));
  } else {
    params.set("what", keywords[0]);
  }

  const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    console.error("Adzuna API HTTP error:", response.status, text.slice(0, 500));
    throw new Error(`Adzuna HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!Array.isArray(json?.results)) {
    console.error("externalJobsSync: unexpected Adzuna response shape");
    return [];
  }
  return json.results;
};

const mapJob = (raw, category, city) => {
  const minSalary = raw.salary_min ?? null;
  const maxSalary = raw.salary_max ?? null;
  const { experienceLevel, experienceLabel } = parseExperience(raw.title, raw.description);

  return {
    adzunaId: String(raw.id),
    title: raw.title,
    company: raw.company?.display_name || "Unknown company",
    companyLogo: "",
    location: raw.location?.display_name || "Not specified",
    city,
    employmentType: employmentTypeLabel(raw),
    description: truncate(raw.description, MAX_DESCRIPTION_CHARS),
    applyLink: raw.redirect_url || "",
    postedAt: raw.created ? new Date(raw.created) : null,
    isRemote: /remote/i.test(raw.title || "") || /remote/i.test(raw.location?.display_name || ""),
    minSalary,
    maxSalary,
    salaryCurrency: "INR",
    payStatus: payStatusFor(minSalary, maxSalary),
    category,
    experienceLevel,
    experienceLabel,
    publisher: "Adzuna",
    source: "external",
    fetchedAt: new Date(),
  };
};

// ✅ Ek category (job/internship) ke saare default cities ke liye upstream
// fetch karta hai, map karta hai, aur Mongo me bulk upsert karta hai
// (adzunaId par unique — dedupe khud MongoDB unique index se ho jaata hai).
const syncCategory = async (category) => {
  const cityResults = await Promise.allSettled(
    DEFAULT_CITIES.map((city) => callAdzuna(category, city))
  );

  const docs = [];
  cityResults.forEach((r, idx) => {
    if (r.status === "fulfilled") {
      const city = DEFAULT_CITIES[idx];
      r.value.forEach((raw) => {
        if (raw?.id) docs.push(mapJob(raw, category, city));
      });
    } else {
      console.error(`externalJobsSync: ${category}/${DEFAULT_CITIES[idx]} failed:`, r.reason?.message);
    }
  });

  if (docs.length === 0) {
    console.warn(`externalJobsSync: 0 jobs fetched for category="${category}", skipping upsert`);
    return { category, upserted: 0 };
  }

  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { adzunaId: doc.adzunaId },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await ExternalJob.bulkWrite(ops, { ordered: false });
  return {
    category,
    upserted: (result.upsertedCount || 0) + (result.modifiedCount || 0),
  };
};

// ✅ Main entry point — cron aur server-startup dono isi ko call karte hain.
// Dono categories ("job", "internship") sequentially sync karta hai taaki
// Adzuna par ek time pe zyada parallel load na jaaye.
export const refreshExternalJobs = async () => {
  if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
    console.error("⚠️  ADZUNA_APP_ID / ADZUNA_APP_KEY missing — external jobs sync skipped");
    return;
  }

  console.log("🔄 External jobs sync started...");
  const start = Date.now();
  const summary = [];

  for (const category of Object.keys(CATEGORY_KEYWORDS)) {
    try {
      const res = await syncCategory(category);
      summary.push(res);
    } catch (err) {
      console.error(`External jobs sync failed for "${category}":`, err.message);
    }
  }

  // ✅ Purani jobs cleanup — jo pichle 3 din se refresh nahi hui (matlab ab
  // Adzuna results me nahi aa rahi), unhe hata do taaki DB bloat na ho
  const staleCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const cleanup = await ExternalJob.deleteMany({ fetchedAt: { $lt: staleCutoff } });

  console.log(
    `✅ External jobs sync done in ${((Date.now() - start) / 1000).toFixed(1)}s — `,
    summary.map((s) => `${s.category}: ${s.upserted}`).join(", "),
    `| removed stale: ${cleanup.deletedCount}`
  );
};