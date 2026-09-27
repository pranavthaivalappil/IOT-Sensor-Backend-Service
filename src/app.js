require("dotenv").config();
const express = require("express");
const { connectDB, disconnectDB } = require("./config/db");
const { connect: mqttConnect, disconnect: mqttDisconnect } = require("./mqtt/mqttClient");
const readingRoutes = require("./routes/readingRoutes");
const deviceRoutes = require("./routes/deviceRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());

// --- Health check ---
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "IoT Sensor Backend running" });
});

// --- Routes ---
app.use("/api/readings", readingRoutes);
app.use("/api/devices", deviceRoutes);

// --- Backward-compatible aliases (old routes still work) ---
app.post("/api/sensor/ingest", (req, res) => {
    res.redirect(307, "/api/readings/ingest");
});
app.get("/api/sensor/:deviceId/latest", (req, res) => {
    res.redirect(307, `/api/readings/${req.params.deviceId}/latest`);
});

// --- 404 handler ---
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
    console.error("[App] Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
});

// --- Startup ---
const start = async () => {
    await connectDB();
    mqttConnect();

    const server = app.listen(PORT, () => {
        console.log(`[App] Server running on port ${PORT}`);
    });

    // --- Graceful shutdown ---
    const shutdown = async (signal) => {
        console.log(`\n[App] ${signal} received — shutting down gracefully...`);
        server.close(async () => {
            mqttDisconnect();
            await disconnectDB();
            console.log("[App] Shutdown complete");
            process.exit(0);
        });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start();

module.exports = app; // exported for tests
