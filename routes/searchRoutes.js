import express from "express";
import { search, aiSearch } from "../controllers/searchController.js";

const router = express.Router();

router.get("/", search);
router.post("/ai", aiSearch);

export default router;
