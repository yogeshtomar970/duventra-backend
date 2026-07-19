// routes/placementRoutes.js
import express from "express";
import {
  getAllJobs,
  createJob,
  deleteJob,
  applyJob,
  getApplied,
  getJobApplications,
} from "../controllers/placementController.js";
 
const router = express.Router();

router.get("/jobs",                        getAllJobs);           // GET  /api/placement/jobs
router.post("/jobs",                       createJob);            // POST /api/placement/jobs
router.delete("/jobs/:id",                 deleteJob);            // DEL  /api/placement/jobs/:id
router.post("/apply",                      applyJob);             // POST /api/placement/apply
router.get("/applied/:userId",             getApplied);           // GET  /api/placement/applied/:userId
router.get("/applications/:jobId",         getJobApplications);   // GET  /api/placement/applications/:jobId

export default router;
