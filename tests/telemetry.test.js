const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { ingestTelemetry } = require("../src/services/telemetryService");
const Reading = require("../src/models/Reading");
const Device = require("../src/models/Device");

let mongoServer;

// --- Setup and Teardown ---

// Runs ONCE before any tests start
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

// Runs ONCE after all tests finish
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Runs BEFORE EVERY single test
// We wipe the database clean so tests don't interfere with each other
afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// --- The Tests ---

describe("Telemetry Service", () => {

    it("should successfully ingest valid telemetry and upsert device", async () => {
        const reading = await ingestTelemetry("sensor-1", 25.5);

        // 1. Check if the reading was saved correctly
        expect(reading.deviceId).toBe("sensor-1");
        expect(reading.temperature).toBe(25.5);
        expect(reading.timestamp).toBeInstanceOf(Date);

        // 2. Check if the device was created/upserted in the database
        const device = await Device.findOne({ deviceId: "sensor-1" });
        expect(device).not.toBeNull();
        expect(device.status).toBe("online");
        expect(device.name).toBe(""); // Default from our upsert logic
    });

    it("should update lastSeen but preserve metadata if device already exists", async () => {
        // Manually create a device first
        await Device.create({
            deviceId: "sensor-2",
            name: "Existing Sensor",
            status: "offline",
            metadata: { location: "Roof" }
        });

        // Ingest new reading
        await ingestTelemetry("sensor-2", 30.1);

        const updatedDevice = await Device.findOne({ deviceId: "sensor-2" });
        expect(updatedDevice.status).toBe("online");
        expect(updatedDevice.name).toBe("Existing Sensor"); // Shouldn't be overwritten!
        expect(updatedDevice.metadata.location).toBe("Roof");
    });

    it("should throw an error for invalid temperature", async () => {
        // Jest way of expecting an error to be thrown
        await expect(ingestTelemetry("sensor-3", "not-a-number"))
            .rejects.toThrow("temperature must be a valid number");

        await expect(ingestTelemetry("sensor-3", 500))
            .rejects.toThrow("plausible range");
    });

    it("should throw an error for missing or empty deviceId", async () => {
        await expect(ingestTelemetry("", 25.5))
            .rejects.toThrow("deviceId must be a non-empty string");

        await expect(ingestTelemetry(null, 25.5))
            .rejects.toThrow("deviceId must be a non-empty string");
    });


});
