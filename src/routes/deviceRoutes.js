const express = require("express");
const router = express.Router();
const { getAllDevices, getDevice, registerDevice, updateDevice } = require("../controllers/deviceController");

router.get("/", getAllDevices);
router.get("/:deviceId", getDevice);
router.post("/", registerDevice);
router.patch("/:deviceId", updateDevice);

module.exports = router;
