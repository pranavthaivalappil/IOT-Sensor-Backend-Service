const Reading = require("../models/Reading");
const Device = require("../models/Device");

/**
 * Ingests a telemetry reading from any source (REST or MQTT).
 * - Saves the reading to the readings collection
 * - Upserts the device document: marks it online, updates lastSeen
 *
 * @param {string} deviceId - Unique device identifier
 * @param {number} temperature - Temperature value
 * @param {Date|number|string} [timestamp] - Optional timestamp (defaults to now)
 * @returns {Promise<Reading>} - The saved reading document
 */

const ingestTelemetry = async (deviceId, temperature, timestamp) => {
    // --- 1. Validate inputs ---
    if (!deviceId || typeof deviceId !== "string" || deviceId.trim() === "") {
        throw new Error("deviceId must be a non-empty string");
    }

    const temp = Number(temperature);
    if (isNaN(temp)) {
        throw new Error("temperature must be a valid number");
    }

    if (temp < -100 || temp > 200) {
        throw new Error("temperature out of plausible range (-100 to 200)");
    }

    const readingTime = timestamp ? new Date(timestamp) : new Date();
    if (isNaN(readingTime.getTime())) {
        throw new Error("timestamp is not a valid date");
    }

    // --- 2. Save the reading ---
    const reading = await Reading.create({
        deviceId: deviceId.trim(),
        temperature: temp,
        timestamp: readingTime
    });

    // --- 3. Upsert the device (create if new, update if existing) ---
    await Device.findOneAndUpdate(
        { deviceId: deviceId.trim() },
        {
            $set: {
                status: "online",
                lastSeen: readingTime
            },
            $setOnInsert: {
                deviceId: deviceId.trim(),
                name: "",
                metadata: {}
            }
        },
        { upsert: true, new: true }
    );

    return reading;
};

module.exports = { ingestTelemetry };
