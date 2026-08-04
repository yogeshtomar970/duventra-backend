// controllers/externalJobsController.js
// JSearch (RapidAPI) se fresher/graduate jobs & internships fetch karta hai.
// Free-tier request quota bachane ke liye simple in-memory cache use kiya hai.

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map(); // key -> { data, expiresAt }

const JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2";

// ✅ FIX: JSearch (Google for Jobs ke upar) generic country-level queries
// jaise "fresher jobs in India" ke against bahut kam / khaali results deta
// hai — unki khud ki docs bhi city-level query recommend karti hain
// (e.g. "developer in berlin", not "developer in Germany"). Isliye ek
// city-specific primary query + ek broader fallback query try karte hain.
const buildQueries = (type, location) => {
  // Agar user ne "India" (ya kuch generic) diya hai to ek well-known tech
  // hub city use karte hain taaki Google for Jobs ka match rate behtar ho
  const isGenericIndia = !location || /^india$/i.test(location.trim());
  const cityLocation = isGenericIndia ? "Bangalore, India" : location;

  const primaryMap = {
    fresher: `fresher jobs in ${cityLocation}`,
    graduate: `graduate jobs in ${cityLocation}`,
    internship: `internship for students in ${cityLocation}`,
  };

  // Fallback: agar primary query 0 jobs de, to thoda broader/generic
  // phrasing try karo (bina "fresher"/"graduate" jaise niche keywords ke,
  // jo har job listing ke title me literally nahi hota)
  const fallbackMap = {
    fresher: `entry level jobs in ${cityLocation}`,
    graduate: `entry level jobs in ${cityLocation}`,
    internship: `internship jobs in ${cityLocation}`,
  };

  return {
    primary: primaryMap[type] || primaryMap.fresher,
    fallback: fallbackMap[type] || fallbackMap.fresher,
  };
};

// Ek JSearch call karta hai aur parsed jobs array (ya throw) return karta hai
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

  // JSearch kabhi kabhi HTTP 200 ke saath bhi status:"ERROR" bhejta hai
  // (e.g. wrong plan, endpoint not included in subscription)
  if (json?.status === "ERROR") {
    console.error("getExternalJobs: JSearch returned status ERROR:", JSON.stringify(json).slice(0, 1000));
    const err = new Error(json?.error?.message || "JSearch API returned an error");
    err.isUpstream = true;
    throw err;
  }

  // search-v2 ka response shape thoda vary kar sakta hai — kayi possible
  // locations check karte hain jahan jobs array ho sakta hai
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
    const { primary, fallback } = buildQueries(type, location);

    const cacheKey = `${type}:${location}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, data: cached.data, cached: true });
    }

    let rawJobs = await callJSearch(primary);

    // ✅ Primary query khaali aayi to broader fallback query try karo
    // pehle response bhejne se pehle — isse "No jobs found" kam dikhega
    if (rawJobs.length === 0) {
      console.warn("getExternalJobs: primary query empty, trying fallback:", fallback);
      rawJobs = await callJSearch(fallback);
    }

    const jobs = mapJobs(rawJobs);

    // Sirf non-empty results cache karo — agar kabhi transient empty response
    // aa jaaye toh wo 1 ghante ke liye stuck na ho jaaye
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