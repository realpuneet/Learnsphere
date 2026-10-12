import mongoose from 'mongoose';

const { Schema } = mongoose;

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 1000 },
    reply: { body: String, at: Date }, // instructor reply
  },
  { timestamps: true },
);
schema.index({ user: 1, course: 1 }, { unique: true });
schema.index({ course: 1, _id: -1 });

export const Review = mongoose.models.Review || mongoose.model('Review', schema);
