const mongoose = require('mongoose');

const ROOM_TYPES = ['single', 'double', 'twin', 'suite', 'deluxe', 'presidential'];
const ROOM_STATUS = ['available', 'occupied', 'maintenance', 'cleaning', 'out_of_order'];

const amenitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: String,
}, { _id: false });

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required'],
      min: [0, 'Floor cannot be negative'],
      max: [200, 'Floor too high'],
    },
    type: {
      type: String,
      enum: { values: ROOM_TYPES, message: 'Invalid room type: {VALUE}' },
      required: [true, 'Room type is required'],
    },
    status: {
      type: String,
      enum: { values: ROOM_STATUS, message: 'Invalid status: {VALUE}' },
      default: 'available',
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: [0, 'Price cannot be negative'],
    },
    capacity: {
      adults: { type: Number, required: true, min: 1, max: 10 },
      children: { type: Number, default: 0, min: 0, max: 10 },
    },
    size: { type: Number, min: 0 }, // sq meters
    bedType: {
      type: String,
      enum: ['single', 'double', 'queen', 'king', 'twin', 'bunk'],
    },
    amenities: [amenitySchema],
    images: [{ type: String }],
    description: { type: String, maxlength: 2000 },
    isSmokingAllowed: { type: Boolean, default: false },
    isPetFriendly: { type: Boolean, default: false },
    hasBalcony: { type: Boolean, default: false },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    lastCleaned: Date,
    lastMaintenance: Date,
    notes: { type: String, maxlength: 500, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// --- Indexes ---
roomSchema.index({ status: 1, type: 1 });
roomSchema.index({ floor: 1 });
roomSchema.index({ pricePerNight: 1 });

// --- Virtuals ---
roomSchema.virtual('isAvailable').get(function () {
  return this.status === 'available';
});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;