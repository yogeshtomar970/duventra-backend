// controllers/externalJobsController.js
// JSearch (RapidAPI) se fresher/graduate jobs & internships fetch karta hai.
//
// ✅ Performance fixes (isse pehle har frontend request seedha JSearch tak
// jaati thi aur poora dataset ek saath bhej diya jaata tha):
//   1. In-memory TTL cache (SOFT_TTL par stale-while-revalidate,
//      HARD_TTL par forced refetch) — JSearch quota bhi bachta hai.
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

const cache = new Map();     // key -> { data, fetchedAt }
const inFlight = new Map();  // key -> Promise (duplicate upstream calls rokne ke liye)

const JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2";

// ✅ Default cities — jab user koi specific location na de, to Delhi NCR
// (Delhi, Noida, Gurgaon) ke jobs dikhate hain, har city ka apna query
// (JSearch/Google for Jobs city-level query par best match karta hai)
const DEFAULT_CITIES = ["Delhi", "Noida", "Gurgaon"];

const queryForCity = (type, city) => {
  const map = {
    fresher: `fresher jobs in ${city}`,
    graduate: `graduate jobs in ${city}`,
    internship: `internship for students in ${city}`,
  };
  return map[type] || map.fresher;
};

const fallbackQueryForCity = (type, city) => {
  const map = {
    fresher: `entry level jobs in ${city}`,
    graduate: `entry level jobs in ${city}`,
    internship: `internship jobs in ${city}`,
  };
  return map[type] || map.fresher;
};

// Ek JSearch call karta hai aur parsed raw jobs array (ya throw) return karta hai
const callJSearch = async (query) => {
  const url = `${JSEARCH_URL}?query=${encodeURIComponent(query)}&num_pages=1&country=in&date_posted=all`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY,
      "x-rapidapi-host": "jsearch.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("JSearch API HTTP error:", response.status, text.slice(0, 500));
    const err = new Error("JSearch API HTTP error");
    err.isUpstream = true;
    throw err;
  }

  const json = await response.json();

  if (json?.status === "ERROR") {
    console.error("getExternalJobs: JSearch returned status ERROR:", JSON.stringify(json).slice(0, 1000));
    const err = new Error(json?.error?.message || "JSearch API returned an error");
    err.isUpstream = true;
    throw err;
  }

  let rawJobs = [];
  if (Array.isArray(json?.data?.jobs)) {
    rawJobs = json.data.jobs;
  } else if (Array.isArray(json?.data)) {
    rawJobs = json.data;
  } else if (Array.isArray(json?.jobs)) {
    rawJobs = json.jobs;
  } else if (Array.isArray(json)) {
    rawJobs = json;
  } else {
    console.error(
      "getExternalJobs: unexpected response shape, top-level keys:",
      Object.keys(json || {})
    );
  }

  if (rawJobs.length === 0) {
    console.error(
      "getExternalJobs: got 0 raw jobs for query:", query,
      "| status:", json?.status,
      "| request_id:", json?.request_id
    );
  }

  return rawJobs;
};

// City ke liye jobs laata hai — primary query try karo, khaali aaye to
// fallback query bhi try karo
const fetchJobsForCity = async (type, city) => {
  let rawJobs = await callJSearch(queryForCity(type, city));
  if (rawJobs.length === 0) {
    rawJobs = await callJSearch(fallbackQueryForCity(type, city));
  }
  return rawJobs;
};

const truncate = (text, max) => {
  if (!text) return "";
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
};

// ✅ Sirf frontend ko chahiye wale fields — baaki JSearch ka raw payload drop
const mapJobs = (rawJobs) =>
  rawJobs.map((j) => ({
    id: j.job_id,
    title: j.job_title,
    company: j.employer_name,
    companyLogo: j.employer_logo || "",
    location:
      [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") ||
      "Not specified",
    employmentType: j.job_employment_type || "N/A",
    description: truncate(j.job_description, MAX_DESCRIPTION_CHARS),
    applyLink: j.job_apply_link || "",
    postedAt: j.job_posted_at_datetime_utc || null,
    isRemote: !!j.job_is_remote,
    minSalary: j.job_min_salary,
    maxSalary: j.job_max_salary,
    salaryCurrency: j.job_salary_currency,
    publisher: j.job_publisher || "",
    source: "external",
  }));

// job_id par dedupe karta hai — same job kabhi kabhi 2 shehron ki search
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
    cities.map((city) => fetchJobsForCity(type, city))
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
  // (duplicate parallel JSearch calls avoid).
  const data = await triggerBackgroundRefresh();
  return { data, cached: false };
};

// ── GET /api/placement/external-jobs?type=fresher&location=India&page=1&limit=15 ──
export const getExternalJobs = async (req, res) => {
  try {
    if (!process.env.RAPIDAPI_KEY) {
      return res.status(500).json({
        success: false,
        message: "RAPIDAPI_KEY not set in .env — JSearch abhi configure nahi hai",
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