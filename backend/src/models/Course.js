import mongoose from 'mongoose';
import { COURSE_STATUS, COURSE_STATUS_LIST, LEVELS } from '../utils/constants.js';

const { Schema } = mongoose;

const sectionSchema = new Schema({ title: { type: String, required: true, trim: true, maxlength: 120 }, order: { type: Number, default: 0 } });

const schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true },
    subtitle: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 10000 },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
    level: { type: String, enum: LEVELS, default: 'all' },
    language: { type: String, default: 'English' },
    tags: [{ type: String, trim: true, lowercase: true }],
    thumbnail: { type: String, default: null },
    previewVideo: { type: String, default: null },
    outcomes: [{ type: String, trim: true }],
    requirements: [{ type: String, trim: true }],

    price: { type: Number, default: 0, min: 0 }, // selling price (GST inclusive), 0 = free
    mrp: { type: Number, default: 0, min: 0 }, // struck-through price
    certificate: { type: Boolean, default: true },

    sections: [sectionSchema],

    status: { type: String, enum: COURSE_STATUS_LIST, default: COURSE_STATUS.DRAFT, index: true },
    rejectionReason: String,
    submittedAt: Date,
    publishedAt: Date,
    featured: { type: Boolean, default: false },

    /** denormalised counters – kept in sync by services (never trust client input) */
    stats: {
      lessons: { type: Number, default: 0 },
      durationSec: { type: Number, default: 0 },
      enrolled: { type: Number, default: 0 },
      ratingAvg: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

schema.index({ status: 1, category: 1, publishedAt: -1 });
schema.index({ status: 1, 'stats.enrolled': -1 });
schema.index({ status: 1, 'stats.ratingAvg': -1 });
schema.index({ status: 1, price: 1 });
schema.index({ instructor: 1, status: 1, updatedAt: -1 });
schema.index({ title: 'text', subtitle: 'text', tags: 'text' });

schema.virtual('isFree').get(function () {
  return !this.price;
});
schema.set('toJSON', { virtuals: true, transform: (_d, r) => { r.id = r._id; delete r.__v; return r; } });

export const Course = mongoose.models.Course || mongoose.model('Course', schema);
