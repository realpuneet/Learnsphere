import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: String,
    data: mongoose.Schema.Types.Mixed,
    readAt: Date,
  },
  { timestamps: true },
);
schema.index({ user: 1, _id: -1 });
schema.index({ user: 1, readAt: 1 });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

schema.set('toJSON', { virtuals: true, transform: (_d, r) => { r.id = r._id; delete r.__v; return r; } });

export const Notification = mongoose.models.Notification || mongoose.model('Notification', schema);
