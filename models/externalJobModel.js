// models/externalJobModel.js
// ✅ Adzuna se aane wale jobs ab is collection me store hote hain.
// Cron job (utils/externalJobsSync.js) din me 3-4 baar Adzuna call karke
// yahan upsert karta hai — frontend requests ab kabhi seedha Adzuna tak
// nahi jaatin, sirf yahi collection query hoti hai.
import mongoose from "mongoose";

const externalJobSchema = new mongoose.Schema(
  {
    adzunaId:     { type: String, required: true, unique: true, index: true },
    title:        { type: String, required: true },
    company:      { type: String, default: "Unknown company" },
    companyLogo:  { type: String, default: "" },
    location:     { type: String, default: "Not specified" },
    city:         { type: String, index: true }, // jis city ke query se ye job aayi (filter ke liye)
    employmentType: { type: String, default: "N/A" },
    description:  { type: String, default: "" },
    applyLink:    { type: String, default: "" },
    postedAt:     { type: Date, default: null },
    isRemote:     { type: Boolean, default: false },

    minSalary:      { type: Number, default: null },
    maxSalary:      { type: Number, default: null },
    salaryCurrency: { type: String, default: "INR" },
    // ✅ Paid / Unpaid filter ke liye — agar Adzuna ne koi salary nahi di
    // (bahut si internships me aisa hota hai) to "unpaid" maan lete hain,
    // warna "paid"
    payStatus: {
      type: String,
      enum: ["paid", "unpaid", "unspecified"],
      default: "unspecified",
    },

    // ✅ "job" = fresher + graduate dono combine (full-time/permanent roles),
    // "internship" = internship listings — frontend ab sirf ye 2 buttons dikhayega
    category: { type: String, enum: ["job", "internship"], required: true, index: true },

    // ✅ Experience — Adzuna structured field nahi deta, isliye title/description
    // se heuristic se nikaalte hain (utils/experienceParser.js)
    experienceLevel: {
      type: String,
      enum: ["fresher", "0-2", "2-5", "5+", "unspecified"],
      default: "unspecified",
      index: true,
    },
    experienceLabel: { type: String, default: "" }, // human-readable, e.g. "0-2 years"

    publisher: { type: String, default: "Adzuna" },
    source:    { type: String, default: "external" },

    fetchedAt: { type: Date, default: Date.now }, // last cron refresh ke time set hota hai
  },
  { timestamps: true }
);

// Listing query ke liye common filters par compound index
externalJobSchema.index({ category: 1, postedAt: -1 });
externalJobSchema.index({ category: 1, city: 1 });
externalJobSchema.index({ category: 1, payStatus: 1 });
externalJobSchema.index({ category: 1, experienceLevel: 1 });

export default mongoose.model("ExternalJob", externalJobSchema);