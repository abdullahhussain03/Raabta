const mongoose = require('mongoose');

// Central DB connection. Keep this as the single place that knows about
// the Mongo connection string so we can swap providers (Atlas, etc.) easily.
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set in environment variables');

    await mongoose.connect(uri);
    console.log(`[db] MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    // Never log secrets (the URI itself may contain credentials) — log a
    // generic message plus the error name only.
    console.error(`[db] Connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
