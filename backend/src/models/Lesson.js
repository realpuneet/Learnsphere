import mongoose from 'mongoose';
import { LESSON_TYPES } from '../utils/constants.js';

const { Schema } = mongoose;

const schema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    section: { type: Schema.Types.ObjectId, required: true }, // _id of Course.sections subdoc
    title: { type: String, required: true, trim: true, maxlength: 140 },
    type: { type: String, enum: LESSON_TYPES, default: 'video' },
    order: { type: Number, default: 0 },
    videoUrl: String, // returned ONLY to enrolled students / free previews
    durationSec: { type: Number, default: 0, min: 0 },
    content: { type: String, maxlength: 60000 }, // markdown for article lessons / notes
    resources: [{ name: { type: String, trim: true }, url: String, _id: false }],
    isPreview: { type: Boolean, default: false },
  },
  { timestamps: true },
);
schema.index({ course: 1, section: 1, order: 1 });

schema.set('toJSON', { virtuals: true, transform: (_d, r) => { r.id = r._id; delete r.__v; return r; } });

export const Lesson = mongoose.models.Lesson || mongoose.model('Lesson', schema);
