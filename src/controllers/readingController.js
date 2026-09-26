const { ingestTelemetry } = require("../services/telemetryService");
const Reading = require("../models/Reading");

// POST /api/readings/ingest
const ingest = async (req, res) => {
    try {
        const { deviceId, temperature, timestamp } = req.body;
        const reading = await ingestTelemetry(deviceId, temperature, timestamp);
        res.status(201).json({ message: "Reading saved", reading });
    } catch (err) {
        const status = err.message.includes("required") ||
            err.message.includes("must be") ||
            err.message.includes("out of plausible") ? 400 : 500;
        res.status(status).json({ error: err.message });
    }
};

// GET /api/readings/:deviceId/latest
const getLatest = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const reading = await Reading.findOne({ deviceId })
            .sort({ timestamp: -1 });

        if (!reading) {
            return res.status(404).json({ error: "No readings found for this device" });
        }
        res.json(reading);
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
};

// GET /api/readings/:deviceId/history?from=&to=&limit=
const getHistory = async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { from, to, limit } = req.query;

        const filter = { deviceId };

        if (from || to) {
            filter.timestamp = {};
            if (from) filter.timestamp.$gte = new Date(from);
            if (to) filter.timestamp.$lte = new Date(to);
        }

        const cap = Math.min(parseInt(limit) || 100, 1000); // max 1000

        const readings = await Reading.find(filter)
            .sort({ timestamp: -1 })
            .limit(cap);

        res.json({ deviceId, count: readings.length, readings });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { ingest, getLatest, getHistory };
