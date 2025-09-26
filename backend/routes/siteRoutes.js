import { Router } from "express";
import {
  analyzeSite,
  getSite,
  getAllSites,
  getNetworkGraph,
} from "../controllers/siteController.js";
import swaggerJsdoc from "swagger-jsdoc";

/**
 * @swagger
 * /api/sites/analyze:
 *   post:
 *     summary: Analyze a website for trackers
 *     parameters:
 *       - name: url
 *         required: true
 *         schema:
 *           type: string
 */

const siteRoutes = Router();

siteRoutes.post("/analyze", analyzeSite);
siteRoutes.get("/network", getNetworkGraph);
siteRoutes.get("/:url", getSite);
siteRoutes.get("/", getAllSites);

export default siteRoutes;
