const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const BOOKING_STATUS = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'];
const PAYMENT_STATUS = ['pending', 'partial', 'paid', 'refunded', 'failed'];
const PAYMENT_METHODS = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other'];

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS },
    transactionId: String,
    paidAt: { type: Date, default: Date.now },
    notes: String,
  },
  { _id: true }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      unique: true,
      default: () => `BK-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Guest is required'],
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Room is required'],
    },
    checkIn: {
      type: Date,
      required: [true, 'Check-in date is required'],
    },
    checkOut: {
      type: Date,
      required: [true, 'Check-out date is required'],
    },
    actualCheckIn: Date,
    actualCheckOut: Date,
    adults: { type: Number, required: true, min: 1, max: 10 },
    children: { type: Number, default: 0, min: 0, max: 10 },
    status: {
      type: String,
      enum: { values: BOOKING_STATUS, message: 'Invalid booking status' },
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: { values: PAYMENT_STATUS, message: 'Invalid payment status' },
      default: 'pending',
    },
    pricing: {
      pricePerNight: { type: Number, required: true },
      nights: { type: Number, required: true },
      subtotal: { type: Number, required: true },
      taxes: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      extraCharges: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
    },
    payments: [paymentSchema],
    source: {
      type: String,
      enum: ['direct', 'online', 'phone', 'walk_in', 'agency', 'other'],
      default: 'direct',
    },
    specialRequests: { type: String, maxlength: 1000 },
    internalNotes: { type: String, maxlength: 1000, select: false },
    cancelledAt: Date,
    cancellationReason: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
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
bookingSchema.index({ guest: 1 });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });
bookingSchema.index({ bookingReference: 1 });

// --- Validation: checkout must be after checkin ---
bookingSchema.pre('validate', function (next) {
  if (this.checkOut <= this.checkIn) {
    this.invalidate('checkOut', 'Check-out must be after check-in');
  }
  next();
});

// --- Virtuals ---
bookingSchema.virtual('amountPaid').get(function () {
  return this.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
});

bookingSchema.virtual('amountDue').get(function () {
  return Math.max(0, (this.pricing?.totalAmount || 0) - this.amountPaid);
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;