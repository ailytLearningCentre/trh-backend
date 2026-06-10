const express = require("express");
const router = express.Router();
const {
  submitHealthData,
  getHealthData,
} = require("../controllers/healthController");

router.post("/submit-health-data", submitHealthData);
router.get("/health-data", getHealthData);

module.exports = router;