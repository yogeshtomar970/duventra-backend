// routes/placementRoutes.js
import express from "express";
import {
  getAllJobs,
  createJob,
  updateJob,
  deleteJob,
  applyJob,
  getApplied,
  getJobApplications,
  getJobsBySociety
} from "../controllers/placementController.js";
import { getExternalJobs } from "../controllers/externalJobsController.js";
import { protect } from "../middlewares/auth.js";
 
const router = express.Router();

router.get("/external-jobs",               getExternalJobs);      // GET  /api/placement/external-jobs?type=fresher&location=India
router.get("/jobs",                        getAllJobs);           // GET  /api/placement/jobs
router.post("/jobs",                       protect, createJob);            // POST /api/placement/jobs
router.put("/jobs/:id",                    protect, updateJob);            // PUT  /api/placement/jobs/:id
router.delete("/jobs/:id",                 protect, deleteJob);            // DEL  /api/placement/jobs/:id
router.post("/apply",                      protect, applyJob);             // POST /api/placement/apply
router.get("/applied/:userId",             protect, getApplied);           // GET  /api/placement/applied/:userId
router.get("/applications/:jobId",         protect, getJobApplications);   // GET  /api/placement/applications/:jobId
router.delete("/jobs/:id/:societyId",      protect, deleteJob);            // DEL  /api/placement/jobs/:id/:societyId
router.get("/jobs/society/:societyId",     getJobsBySociety);    // GET  /api/placement/jobs/society/:societyId

export default router;