const mongoose = require('mongoose');

const ID_TYPES = ['passport', 'national_id', 'drivers_license', 'other'];

const guestSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name too long'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    dateOfBirth: Date,
    nationality: { type: String, trim: true },
    idType: {
      type: String,
      enum: { values: ID_TYPES, message: 'Invalid ID type' },
    },
    idNumber: { type: String, trim: true, select: false },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    vipStatus: {
      type: String,
      enum: ['none', 'silver', 'gold', 'platinum'],
      default: 'none',
    },
    preferences: {
      floorPreference: String,
      bedPreference: String,
      smokingRoom: { type: Boolean, default: false },
      dietaryRestrictions: [String],
      specialRequests: String,
    },
    totalStays: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    notes: { type: String, maxlength: 1000, select: false },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// --- Indexes ---
guestSchema.index({ email: 1 });
guestSchema.index({ lastName: 1, firstName: 1 });
guestSchema.index({ vipStatus: 1 });
guestSchema.index({ '$**': 'text' }); // Full-text search

// --- Virtuals ---
guestSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

const Guest = mongoose.model('Guest', guestSchema);
module.exports = Guest;