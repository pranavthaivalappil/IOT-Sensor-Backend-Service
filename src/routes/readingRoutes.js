const express = require("express");
const router = express.Router();
const { ingest, getLatest, getHistory } = require("../controllers/readingController");

router.post("/ingest", ingest);
router.get("/:deviceId/latest", getLatest);
router.get("/:deviceId/history", getHistory);

module.exports = router;
