import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Q&A: a student's question on a lesson with a flat list of answers. */
const schema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, trim: true, maxlength: 4000 },
    answers: [
      {
        author: { type: Schema.Types.ObjectId, ref: 'User' },
        body: { type: String, maxlength: 4000 },
        isInstructor: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolved: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
schema.index({ course: 1, lesson: 1, lastActivityAt: -1 });
schema.index({ course: 1, resolved: 1, lastActivityAt: -1 });
schema.index({ author: 1, _id: -1 });

export const Thread = mongoose.models.Thread || mongoose.model('Thread', schema);
