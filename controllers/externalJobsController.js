// controllers/externalJobsController.js
// JSearch (RapidAPI) se fresher/graduate jobs & internships fetch karta hai.
// Free-tier request quota bachane ke liye simple in-memory cache use kiya hai.

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map(); // key -> { data, expiresAt }

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
    description: j.job_description || "",
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

// ── GET /api/placement/external-jobs?type=fresher&location=India&page=1 ──
export const getExternalJobs = async (req, res) => {
  try {
    if (!process.env.RAPIDAPI_KEY) {
      return res.status(500).json({
        success: false,
        message: "RAPIDAPI_KEY not set in .env — JSearch abhi configure nahi hai",
      });
    }

    const { type = "fresher", location = "India", page = "1" } = req.query;

    // Agar user ne specific location di hai (India/generic nahi), to sirf
    // usi city ke liye search karo. Warna default Delhi NCR (Delhi, Noida,
    // Gurgaon) — teeno ka combined result dikhao.
    const isGenericIndia = !location || /^india$/i.test(location.trim());
    const cities = isGenericIndia ? DEFAULT_CITIES : [location];

    const cacheKey = `${type}:${cities.join(",")}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, data: cached.data, cached: true });
    }

    // ✅ Sabhi cities ke liye parallel me fetch karo aur combine/dedupe karo
    const results = await Promise.allSettled(
      cities.map((city) => fetchJobsForCity(type, city))
    );

    let rawJobs = [];
    results.forEach((r) => {
      if (r.status === "fulfilled") rawJobs = rawJobs.concat(r.value);
    });

    // Agar sabhi cities fail ho gayi (koi bhi fulfilled nahi), to asli
    // upstream error surface karo instead of silently "0 jobs"
    const allFailed = results.every((r) => r.status === "rejected");
    if (allFailed && results.length > 0) {
      throw results[0].reason;
    }

    const jobs = dedupeById(mapJobs(rawJobs));

    if (jobs.length > 0) {
      cache.set(cacheKey, { data: jobs, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    res.json({ success: true, data: jobs, cached: false });
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