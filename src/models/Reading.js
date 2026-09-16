const mongoose = require("mongoose");

const readingSchema = new mongoose.Schema({
    deviceId: {
        type: String,
        required: true,
        index: true
    },
    temperature: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: false,
    versionKey: false
});

// Compound index — the most common query pattern:
// "for giving me readings for device X sorted by time"
readingSchema.index({ deviceId: 1, timestamp: -1 });

// Index for time-range queries across all devices
readingSchema.index({ timestamp: -1 });

module.exports = mongoose.model("Reading", readingSchema);
