import mongoose from 'mongoose';

const { Schema } = mongoose;

/** Immutable record. `signature` = HMAC(code|user|course|issuedAt) so a verifier can detect tampering. */
const schema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true, unique: true },
    studentName: { type: String, required: true },
    courseTitle: { type: String, required: true },
    instructorName: { type: String, required: true },
    hours: Number,
    issuedAt: { type: Date, default: Date.now },
    signature: { type: String, required: true },
  },
  { timestamps: true },
);

export const Certificate = mongoose.models.Certificate || mongoose.model('Certificate', schema);
