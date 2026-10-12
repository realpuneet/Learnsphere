import mongoose from 'mongoose';
import { QUESTION_TYPES } from '../utils/constants.js';

const { Schema } = mongoose;

const optionSchema = new Schema({ text: { type: String, required: true, trim: true, maxlength: 300 }, correct: { type: Boolean, default: false } });
const questionSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  type: { type: String, enum: QUESTION_TYPES, default: 'single' },
  options: { type: [optionSchema], validate: (v) => v.length >= 2 && v.length <= 8 },
  explanation: { type: String, maxlength: 1000 },
  points: { type: Number, default: 1, min: 1, max: 20 },
});

/** One quiz per quiz-type lesson. `correct` / `explanation` never leave the server before a graded attempt. */
const schema = new Schema(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', required: true, unique: true },
    passPercent: { type: Number, default: 60, min: 1, max: 100 },
    maxAttempts: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    shuffle: { type: Boolean, default: true },
    questions: { type: [questionSchema], validate: (v) => v.length >= 1 && v.length <= 100 },
  },
  { timestamps: true },
);

export const Quiz = mongoose.models.Quiz || mongoose.model('Quiz', schema);
