// controllers/externalJobsController.js
// ✅ Ab Adzuna API use karta hai (pehle RapidAPI/JSearch tha, jiska free
// tier bahut jaldi khatam ho jaata tha). Adzuna ka free tier ~1000
// calls/month hai, aur India (country code "in") support karta hai —
// aur humari caching ke saath (neeche) actual upstream calls din me
// mushkil se dus-bees hi lagti hain, isliye 1000/month me aaraam se aa jaata hai.
//
// Adzuna free keys yahan se milti hain (RapidAPI jaisi koi middle-man
// nahi): https://developer.adzuna.com/  →  ADZUNA_APP_ID + ADZUNA_APP_KEY
// .env me daalo.
//
// ✅ Performance fixes (isse pehle har frontend request seedha upstream
// tak jaati thi aur poora dataset ek saath bhej diya jaata tha):
//   1. In-memory TTL cache (SOFT_TTL par stale-while-revalidate,
//      HARD_TTL par forced refetch) — upstream quota bhi bachta hai.
//   2. In-flight request de-duplication — same key ke liye ek time par
//      sirf EK upstream call jaati hai, baaki sab usi promise ko await
//      karte hain (duplicate parallel calls avoid).
//   3. Server-side pagination (page/limit) — pehli request me sirf
//      15 jobs bhejta hai, baaki "Load More" par.
//   4. Response payload chhota — sirf zaroori fields, description
//      truncate (list view ko poori JD ki zaroorat nahi).

const SOFT_TTL_MS = 5 * 60 * 1000;   // isse pehle tak cache "fresh" hai, seedha serve karo
const HARD_TTL_MS = 30 * 60 * 1000;  // isse baad cache "dead" hai, forced refetch karna hi hoga

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;
const MAX_DESCRIPTION_CHARS = 1500; // list/detail dono ke liye kaafi, poori raw JD nahi
const RESULTS_PER_CITY = 20;        // ek city ke liye Adzuna se ek call me kitne results maangne hain

const cache = new Map();     // key -> { data, fetchedAt }
const inFlight = new Map();  // key -> Promise (duplicate upstream calls rokne ke liye)

const ADZUNA_COUNTRY = "in"; // India

// ✅ Default cities — jab user koi specific location na de, to Delhi NCR
// (Delhi, Noida, Gurgaon) ke jobs dikhate hain
const DEFAULT_CITIES = ["Delhi", "Noida", "Gurgaon"];

const queryForType = (type) => {
  const map = {
    fresher: "fresher",
    graduate: "graduate",
    internship: "internship",
  };
  return map[type] || map.fresher;
};

// Ek Adzuna call karta hai (ek city ke liye) aur raw results array return karta hai
const callAdzuna = async (type, city) => {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID,
    app_key: process.env.ADZUNA_APP_KEY,
    what: queryForType(type),
    where: city,
    results_per_page: String(RESULTS_PER_CITY),
    sort_by: "date",
    "content-type": "application/json",
  });

  const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    console.error("Adzuna API HTTP error:", response.status, text.slice(0, 500));
    const err = new Error("Adzuna API HTTP error");
    err.isUpstream = true;
    throw err;
  }

  const json = await response.json();

  if (!Array.isArray(json?.results)) {
    console.error("getExternalJobs: unexpected Adzuna response shape, keys:", Object.keys(json || {}));
    return [];
  }

  if (json.results.length === 0) {
    console.error("getExternalJobs: 0 results for", type, city);
  }

  return json.results;
};

const truncate = (text, max) => {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
};

// Adzuna contract_time/contract_type ko ek readable label me convert karta hai
const employmentTypeLabel = (job) => {
  const parts = [];
  if (job.contract_time === "full_time") parts.push("Full-time");
  else if (job.contract_time === "part_time") parts.push("Part-time");
  if (job.contract_type === "permanent") parts.push("Permanent");
  else if (job.contract_type === "contract") parts.push("Contract");
  return parts.length > 0 ? parts.join(" · ") : "N/A";
};

// ✅ Sirf frontend ko chahiye wale fields — baaki Adzuna ka raw payload drop
const mapJobs = (rawJobs) =>
  rawJobs.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company?.display_name || "Unknown company",
    companyLogo: "", // Adzuna logo nahi deta
    location: j.location?.display_name || "Not specified",
    employmentType: employmentTypeLabel(j),
    description: truncate(j.description, MAX_DESCRIPTION_CHARS),
    applyLink: j.redirect_url || "",
    postedAt: j.created || null,
    isRemote: /remote/i.test(j.title || "") || /remote/i.test(j.location?.display_name || ""),
    minSalary: j.salary_min,
    maxSalary: j.salary_max,
    salaryCurrency: "INR",
    publisher: "Adzuna",
    source: "external",
  }));

// job id par dedupe karta hai — same job kabhi kabhi 2 shehron ki search
// me duplicate aa sakti hai (e.g. "Delhi/NCR" wali listing)
const dedupeById = (jobs) => {
  const seen = new Set();
  return jobs.filter((j) => {
    if (!j.id || seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });
};

// Cities ke liye actual upstream fetch + map + dedupe (no caching logic here)
const fetchFromUpstream = async (type, cities) => {
  const results = await Promise.allSettled(
    cities.map((city) => callAdzuna(type, city))
  );

  let rawJobs = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") rawJobs = rawJobs.concat(r.value);
  });

  const allFailed = results.every((r) => r.status === "rejected");
  if (allFailed && results.length > 0) {
    throw results[0].reason;
  }

  return dedupeById(mapJobs(rawJobs));
};

// ✅ Cache + in-flight dedupe ke saath poora dataset laata hai (pagination
// se independent — ek baar fetch, kई pages usi se serve hote hain).
// Stale-while-revalidate: SOFT_TTL ke baad bhi purana data turant serve
// hota hai jabki background me nayi request chal rahi hoti hai; HARD_TTL
// ke baad forced (blocking) refetch hota hai.
const getJobsDataset = async (type, cities) => {
  const key = `${type}:${cities.join(",")}`;
  const now = Date.now();
  const cached = cache.get(key);

  const isFresh = cached && now - cached.fetchedAt < SOFT_TTL_MS;
  const isDead = !cached || now - cached.fetchedAt >= HARD_TTL_MS;

  const triggerBackgroundRefresh = () => {
    if (inFlight.has(key)) return inFlight.get(key); // pehle se hi ek refresh chal rahi hai — usi ko share karo
    const p = fetchFromUpstream(type, cities)
      .then((jobs) => {
        if (jobs.length > 0) cache.set(key, { data: jobs, fetchedAt: Date.now() });
        return jobs;
      })
      .catch((err) => {
        console.error(`Refresh failed for ${key}:`, err.message);
        throw err;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, p);
    return p;
  };

  if (isFresh) {
    return { data: cached.data, cached: true };
  }

  if (cached && !isDead) {
    // Stale but usable — turant purana data do, background me refresh karo
    triggerBackgroundRefresh();
    return { data: cached.data, cached: true, stale: true };
  }

  // Cache dead ya khaali — refetch ka wait karna padega. Agar isi key ke
  // liye pehle se koi in-flight request chal rahi hai, usi ko await karo
  // (duplicate parallel upstream calls avoid).
  const data = await triggerBackgroundRefresh();
  return { data, cached: false };
};

// ── GET /api/placement/external-jobs?type=fresher&location=India&page=1&limit=15 ──
export const getExternalJobs = async (req, res) => {
  try {
    if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
      return res.status(500).json({
        success: false,
        message: "ADZUNA_APP_ID / ADZUNA_APP_KEY .env me set nahi hain — https://developer.adzuna.com/ se free key lelo",
      });
    }

    const { type = "fresher", location = "India" } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

    // Agar user ne specific location di hai (India/generic nahi), to sirf
    // usi city ke liye search karo. Warna default Delhi NCR (Delhi, Noida,
    // Gurgaon) — teeno ka combined result dikhao.
    const isGenericIndia = !location || /^india$/i.test(location.trim());
    const cities = isGenericIndia ? DEFAULT_CITIES : [location];

    const { data: allJobs, cached, stale } = await getJobsDataset(type, cities);

    const start = (page - 1) * limit;
    const pageJobs = allJobs.slice(start, start + limit);

    res.json({
      success: true,
      data: pageJobs,
      page,
      limit,
      total: allJobs.length,
      hasMore: start + limit < allJobs.length,
      cached: !!cached,
      stale: !!stale,
    });
  } catch (err) {
    console.error("getExternalJobs error:", err.message);
    if (err.isUpstream) {
      return res.status(502).json({
        success: false,
        message: "External job source abhi available nahi hai, thodi der baad try karein",
      });
    }
    res.status(500).json({ success: false, message: "Kuch galat ho gaya external jobs fetch karte waqt" });
  }
};