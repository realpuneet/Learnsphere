import mongoose from 'mongoose';

const { Schema } = mongoose;

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true },
    answers: [{ question: Schema.Types.ObjectId, selected: [Schema.Types.ObjectId], _id: false }],
    points: Number,
    total: Number,
    scorePct: Number,
    passed: Boolean,
  },
  { timestamps: true },
);
schema.index({ user: 1, quiz: 1, createdAt: -1 });
schema.index({ course: 1, createdAt: -1 });

export const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model('QuizAttempt', schema);
