import mongoose from 'mongoose';

/** One row per outbound email / WhatsApp attempt – lets admins audit "was the patient informed?" */
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    channel: { type: String, enum: ['email'], required: true },
    type: String,
    to: String,
    ref: { kind: String, id: mongoose.Schema.Types.ObjectId },
    status: { type: String, enum: ['queued', 'sent', 'failed', 'dry_run'], default: 'queued', index: true },
    provider: String,
    providerId: String,
    error: String,
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index({ 'ref.id': 1, channel: 1 });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

export const NotificationLog = mongoose.models.NotificationLog || mongoose.model('NotificationLog', schema);
