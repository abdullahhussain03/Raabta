const mongoose = require('mongoose');

// Simple group chat backing store. The frontend polls GET /groups/:id/messages
// on an interval rather than using WebSockets/Socket.io.
//
// Tradeoff note: polling is simpler to build/deploy for an MVP (no extra
// infra, works behind any reverse proxy, no sticky-session concerns) but has
// higher latency and more redundant requests than a WebSocket/SSE push
// channel. Revisit with Socket.io (or SSE) once group chat volume justifies
// the added complexity.
const groupMessageSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  { timestamps: true }
);

groupMessageSchema.index({ group: 1, createdAt: 1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
