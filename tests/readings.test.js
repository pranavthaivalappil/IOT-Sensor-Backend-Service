const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const app = require("../src/app");
const Reading = require("../src/models/Reading");
const Device = require("../src/models/Device");

let mongoServer;

// --- Setup and Teardown ---
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
});

// --- Tests ---
describe("POST /api/readings/ingest", () => {

    it("should ingest valid data and return 201", async () => {
        const res = await request(app)
            .post("/api/readings/ingest")
            .send({ deviceId: "sensor-01", temperature: 28.5 });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe("Reading saved");
        expect(res.body.reading.deviceId).toBe("sensor-01");
        expect(res.body.reading.temperature).toBe(28.5);
    });

    it("should return 400 for missing deviceId", async () => {
        const res = await request(app)
            .post("/api/readings/ingest")
            .send({ temperature: 28.5 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch("deviceId");
    });

    it("should return 400 for temperature out of range", async () => {
        const res = await request(app)
            .post("/api/readings/ingest")
            .send({ deviceId: "sensor-01", temperature: 999 });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch("plausible range");
    });

});

describe("GET /api/readings/:deviceId/latest", () => {

    it("should return the most recent reading", async () => {
        // Seed two readings — different timestamps
        const older = new Date("2024-01-01T10:00:00Z");
        const newer = new Date("2024-01-01T11:00:00Z");

        await Reading.create({ deviceId: "sensor-01", temperature: 20, timestamp: older });
        await Reading.create({ deviceId: "sensor-01", temperature: 30, timestamp: newer });

        const res = await request(app)
            .get("/api/readings/sensor-01/latest");

        expect(res.status).toBe(200);
        expect(res.body.temperature).toBe(30); // newer reading has temp 30
    });

    it("should return 404 for a device with no readings", async () => {
        const res = await request(app)
            .get("/api/readings/ghost-device/latest");

        expect(res.status).toBe(404);
    });

});

describe("GET /api/readings/:deviceId/history", () => {

    beforeEach(async () => {
        // Seed 5 readings spread across time
        const readings = [
            { deviceId: "sensor-01", temperature: 10, timestamp: new Date("2024-01-01T08:00:00Z") },
            { deviceId: "sensor-01", temperature: 20, timestamp: new Date("2024-01-01T09:00:00Z") },
            { deviceId: "sensor-01", temperature: 30, timestamp: new Date("2024-01-01T10:00:00Z") },
            { deviceId: "sensor-01", temperature: 40, timestamp: new Date("2024-01-01T11:00:00Z") },
            { deviceId: "sensor-01", temperature: 50, timestamp: new Date("2024-01-01T12:00:00Z") },
        ];
        await Reading.insertMany(readings);
    });

    it("should return all readings when no filters given", async () => {
        const res = await request(app)
            .get("/api/readings/sensor-01/history");

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(5);
    });

    it("should filter by from and to timestamps", async () => {
        const res = await request(app)
            .get("/api/readings/sensor-01/history")
            .query({ from: "2024-01-01T09:00:00Z", to: "2024-01-01T11:00:00Z" });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(3); // 09:00, 10:00, 11:00
    });

    it("should respect the limit parameter", async () => {
        const res = await request(app)
            .get("/api/readings/sensor-01/history")
            .query({ limit: 2 });

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(2);
    });

});
