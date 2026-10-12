import mongoose from 'mongoose';
import { ENROLL_SOURCE, ENROLL_STATUS } from '../utils/constants.js';

const { Schema } = mongoose;

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // denormalised for earnings queries
    status: { type: String, enum: Object.values(ENROLL_STATUS), default: ENROLL_STATUS.ACTIVE },
    source: { type: String, enum: Object.values(ENROLL_SOURCE), default: ENROLL_SOURCE.FREE },
    payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    amountPaid: { type: Number, default: 0 }, // GST-inclusive rupees actually paid
    coupon: String,

    completed: [{ type: Schema.Types.ObjectId }], // lesson ids
    percent: { type: Number, default: 0 },
    lastLesson: { type: Schema.Types.ObjectId },
    lastPosition: { lesson: Schema.Types.ObjectId, sec: { type: Number, default: 0 } },
    completedAt: Date,
    lastActivityAt: { type: Date, default: Date.now },
    nudgedAt: Date,
    certificate: { type: Schema.Types.ObjectId, ref: 'Certificate' },
    refundedAt: Date,
  },
  { timestamps: true },
);
schema.index({ user: 1, course: 1 }, { unique: true });
schema.index({ user: 1, updatedAt: -1 });
schema.index({ course: 1, createdAt: -1 });
schema.index({ status: 1, lastActivityAt: 1 });

export const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', schema);
