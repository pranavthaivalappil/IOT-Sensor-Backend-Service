const mqtt = require("mqtt");
const { ingestTelemetry } = require("../services/telemetryService");

const BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com:1883";
const TOPIC = process.env.MQTT_TOPIC || "iot/sensor/+/temperature";

let client = null;

const connect = () => {
    client = mqtt.connect(BROKER_URL, {
        reconnectPeriod: 5000,   // retry every 5 seconds after disconnect
        connectTimeout: 10000    // give up connecting after 10 seconds
    });

    // --- Connection events ---
    client.on("connect", () => {
        console.log(`[MQTT] Connected to broker: ${BROKER_URL}`);

        client.subscribe(TOPIC, (err) => {
            if (err) {
                console.error("[MQTT] Subscription error:", err.message);
            } else {
                console.log(`[MQTT] Subscribed to topic: ${TOPIC}`);
            }
        });
    });

    client.on("reconnect", () => {
        console.log("[MQTT] Attempting to reconnect...");
    });

    client.on("offline", () => {
        console.warn("[MQTT] Client is offline");
    });

    client.on("error", (err) => {
        console.error("[MQTT] Connection error:", err.message);
    });

    // --- Message handler ---
    client.on("message", async (topic, message) => {
        let payload;

        // 1. Parse JSON safely
        try {
            payload = JSON.parse(message.toString());
        } catch {
            console.warn(`[MQTT] Malformed JSON on topic ${topic}:`, message.toString());
            return; // skip message, don't crash
        }

        // 2. Extract deviceId from topic: iot/sensor/<deviceId>/temperature
        const parts = topic.split("/");
        if (parts.length < 3) {
            console.warn("[MQTT] Unexpected topic format:", topic);
            return;
        }
        const deviceId = parts[2];

        // 3. Delegate to telemetryService (validation + persistence)
        try {
            await ingestTelemetry(deviceId, payload.temperature, payload.timestamp);
            console.log(`[MQTT] Reading saved — device: ${deviceId}, temp: ${payload.temperature}`);
        } catch (err) {
            console.error(`[MQTT] Failed to ingest reading for ${deviceId}:`, err.message);
        }
    });
};

const disconnect = () => {
    if (client && client.connected) {
        client.end(true); // true = force close
        console.log("[MQTT] Disconnected");
    }
};

module.exports = { connect, disconnect };
