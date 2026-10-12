import mongoose from 'mongoose';
import { ROLE_LIST, ROLES } from '../utils/constants.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLE_LIST, default: ROLES.STUDENT, index: true },
    avatar: { type: String, default: null },
    headline: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 2000 },
    links: { website: String, linkedin: String, github: String, twitter: String },

    /** Instructor state. Instructors can draft immediately but need approval to submit courses for review. */
    instructor: {
      approved: { type: Boolean, default: false },
      appliedAt: Date,
      approvedAt: Date,
    },

    /** Email is an OPTIONAL channel – in-app notifications always happen. */
    prefs: {
      emailUpdates: { type: Boolean, default: true }, // enrolment / certificate / approval mails
      emailNudges: { type: Boolean, default: true }, // "continue learning" reminders
      emailQa: { type: Boolean, default: true }, // answers to your questions
    },

    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    /** Social login identities (provider subject ids). */
    googleId: { type: String, index: { unique: true, sparse: true } },
    linkedinId: { type: String, index: { unique: true, sparse: true } },
    lastLoginAt: Date,
    lastActiveAt: Date,
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ name: 'text', email: 'text' });
userSchema.index({ role: 1, isActive: 1, createdAt: -1 });

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_d, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    ret.id = ret._id;
    return ret;
  },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
