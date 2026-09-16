const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        isConnected = true;
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    if (!isConnected) return;
    await mongoose.disconnect();
    isConnected = false;
    console.log("MongoDB disconnected");
};

module.exports = { connectDB, disconnectDB };
