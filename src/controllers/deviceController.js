const Device = require("../models/Device");

// GET /api/devices
const getAllDevices = async (req, res) => {
    try {
        const devices = await Device.find().sort({ lastSeen: -1 });
        res.json({ count: devices.length, devices });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/devices/:deviceId
const getDevice = async (req, res) => {
    try {
        const device = await Device.findOne({ deviceId: req.params.deviceId });
        if (!device) {
            return res.status(404).json({ error: "Device not found" });
        }
        res.json(device);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
};

// POST /api/devices  (manual device registration)
const registerDevice = async (req, res) => {
    try {
        const { deviceId, name, metadata } = req.body;
        if (!deviceId) {
            return res.status(400).json({ error: "deviceId is required" });
        }

        const existing = await Device.findOne({ deviceId });
        if (existing) {
            return res.status(409).json({ error: "Device already exists" });
        }

        const device = await Device.create({ deviceId, name, metadata });
        res.status(201).json({ message: "Device registered", device });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
};

// PATCH /api/devices/:deviceId  (update name or metadata)
const updateDevice = async (req, res) => {
    try {
        const { name, metadata } = req.body;
        const device = await Device.findOneAndUpdate(
            { deviceId: req.params.deviceId },
            { $set: { name, metadata } },
            { new: true, runValidators: true }
        );
        if (!device) {
            return res.status(404).json({ error: "Device not found" });
        }
        res.json({ message: "Device updated", device });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { getAllDevices, getDevice, registerDevice, updateDevice };
