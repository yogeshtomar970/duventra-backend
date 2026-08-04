// controllers/externalJobsController.js
// JSearch (RapidAPI) se fresher/graduate jobs & internships fetch karta hai.
// Free-tier request quota bachane ke liye simple in-memory cache use kiya hai.

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map(); // key -> { data, expiresAt }

const JSEARCH_URL = "https://jsearch.p.rapidapi.com/search";

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

    // type ke hisaab se search query banate hain
    const queryMap = {
      fresher: `fresher jobs in ${location}`,
      graduate: `graduate jobs in ${location}`,
      internship: `internship for students in ${location}`,
    };
    const query = queryMap[type] || queryMap.fresher;

    const cacheKey = `${type}:${location}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, data: cached.data, cached: true });
    }

    const url = `${JSEARCH_URL}?query=${encodeURIComponent(query)}&page=${page}&num_pages=1&country=in`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("JSearch API error:", response.status, text);
      return res.status(502).json({
        success: false,
        message: "External job source abhi available nahi hai, thodi der baad try karein",
      });
    }

    const json = await response.json();
    const rawJobs = json?.data || [];

    // Sirf wahi fields bhejo jo frontend ko chahiye — payload halka rahega
    const jobs = rawJobs.map((j) => ({
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

    cache.set(cacheKey, { data: jobs, expiresAt: Date.now() + CACHE_TTL_MS });

    res.json({ success: true, data: jobs, cached: false });
  } catch (err) {
    console.error("getExternalJobs error:", err.message);
    res.status(500).json({ success: false, message: "Kuch galat ho gaya external jobs fetch karte waqt" });
  }
};