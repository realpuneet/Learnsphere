import mongoose from 'mongoose';

const { Schema } = mongoose;

const schema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true, min: 1 },
    maxDiscount: { type: Number, min: 0 },
    course: { type: Schema.Types.ObjectId, ref: 'Course' }, // optional scope
    owner: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // creator (admin or instructor)
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    used: { type: Number, default: 0 },
    expiresAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', schema);
