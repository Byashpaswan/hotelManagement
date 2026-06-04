const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Guest = require('../models/Guest');
const factory = require('../services/factory');
const { catchAsync, sendResponse, AppError } = require('../utils/appError');
const publishBookingEvent = require('../producer/bookingProducer');

const POPULATE_OPTIONS = [
  { path: 'guest', select: 'firstName lastName email phone vipStatus' },
  { path: 'room', select: 'roomNumber type floor pricePerNight status' },
  { path: 'createdBy', select: 'name role' },
];

exports.getAllBookings = factory.getAll(Booking, ['bookingReference']);
exports.getBooking = factory.getOne(Booking, POPULATE_OPTIONS);

/**
 * Create booking with availability check and price calculation.
 */
exports.createBooking = catchAsync(async (req, res) => {
  const { guest: guestId, room: roomId, checkIn, checkOut, adults, children = 0,
    source, specialRequests } = req.body;

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  // 1. Validate room exists and is available
  const room = await Room.findById(roomId);
  if (!room) throw new AppError('Room not found.', 404);
  if (room.status === 'out_of_order' || room.status === 'maintenance') {
    throw new AppError(`Room ${room.roomNumber} is not available (${room.status}).`, 409);
  }

  // 2. Check for conflicting bookings
  const conflict = await Booking.findOne({
    room: roomId,
    status: { $in: ['pending', 'confirmed', 'checked_in'] },
    $or: [{ checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }],
  });
  if (conflict) throw new AppError('Room is not available for the selected dates.', 409);

  // 3. Validate guest
  const guest = await Guest.findById(guestId);
  if (!guest) throw new AppError('Guest not found.', 404);
  if (guest.isBlacklisted) throw new AppError('This guest is blacklisted and cannot make bookings.', 403);

  // 4. Check capacity
  if (adults > room.capacity.adults) {
    throw new AppError(`Room capacity: ${room.capacity.adults} adults max.`, 422);
  }

  // 5. Calculate pricing
  const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
  const pricePerNight = room.pricePerNight;
  const subtotal = nights * pricePerNight;
  const taxes = parseFloat((subtotal * 0.12).toFixed(2)); // 12% tax
  const totalAmount = subtotal + taxes;

  const booking = await Booking.create({
    guest: guestId,
    room: roomId,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    adults,
    children,
    source,
    specialRequests,
    pricing: { pricePerNight, nights, subtotal, taxes, discount: 0, extraCharges: 0, totalAmount },
    status: 'confirmed',
    createdBy: req.user._id,
  });

  await booking.populate(POPULATE_OPTIONS);

   // Push Queue Job
    await publishBookingEvent({
      bookingId: booking._id,
    });

  sendResponse(res, 201, booking);

});

/**
 * Check in a guest.
 */
exports.checkIn = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.status !== 'confirmed') {
    throw new AppError(`Cannot check in: booking status is '${booking.status}'.`, 409);
  }

  booking.status = 'checked_in';
  booking.actualCheckIn = new Date();
  booking.updatedBy = req.user._id;
  await booking.save();

  // Mark room as occupied
  await Room.findByIdAndUpdate(booking.room, { status: 'occupied' });

  await booking.populate(POPULATE_OPTIONS);
  sendResponse(res, 200, booking);
});

/**
 * Check out a guest.
 */
exports.checkOut = catchAsync(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);
  if (booking.status !== 'checked_in') {
    throw new AppError(`Cannot check out: booking status is '${booking.status}'.`, 409);
  }

  booking.status = 'checked_out';
  booking.actualCheckOut = new Date();
  booking.paymentStatus = 'paid';
  booking.updatedBy = req.user._id;
  await booking.save();

  // Mark room as cleaning
  await Room.findByIdAndUpdate(booking.room, { status: 'cleaning' });

  // Update guest stats
  await Guest.findByIdAndUpdate(booking.guest, {
    $inc: { totalStays: 1, totalSpent: booking.pricing.totalAmount },
  });

  await booking.populate(POPULATE_OPTIONS);
  sendResponse(res, 200, booking);
});

/**
 * Cancel a booking.
 */
exports.cancelBooking = catchAsync(async (req, res) => {
  const { cancellationReason } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);
  if (['checked_out', 'cancelled'].includes(booking.status)) {
    throw new AppError(`Booking is already ${booking.status}.`, 409);
  }

  const wasCheckedIn = booking.status === 'checked_in';
  booking.status = 'cancelled';
  booking.cancellationReason = cancellationReason;
  booking.cancelledAt = new Date();
  booking.updatedBy = req.user._id;
  await booking.save();

  if (wasCheckedIn) {
    await Room.findByIdAndUpdate(booking.room, { status: 'cleaning' });
  } else {
    await Room.findByIdAndUpdate(booking.room, { status: 'available' });
  }

  sendResponse(res, 200, booking);
});

/**
 * Add a payment to a booking.
 */
exports.addPayment = catchAsync(async (req, res) => {
  const { amount, method, transactionId, notes } = req.body;
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found.', 404);

  booking.payments.push({ amount, method, transactionId, notes });
  const totalPaid = booking.payments.reduce((s, p) => s + p.amount, 0);
  booking.paymentStatus = totalPaid >= booking.pricing.totalAmount ? 'paid'
    : totalPaid > 0 ? 'partial' : 'pending';

  await booking.save();
  await booking.populate(POPULATE_OPTIONS);
  sendResponse(res, 200, booking);
});

/**
 * Dashboard stats.
 */
exports.getBookingStats = catchAsync(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [statusSummary, revenue, todayArrivals, todayDepartures] = await Promise.all([
    Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { status: 'checked_out', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' } } },
    ]),
    Booking.countDocuments({ checkIn: { $gte: today, $lt: tomorrow }, status: 'confirmed' }),
    Booking.countDocuments({ checkOut: { $gte: today, $lt: tomorrow }, status: 'checked_in' }),
  ]);

  sendResponse(res, 200, {
    statusSummary,
    totalRevenue: revenue[0]?.total || 0,
    todayArrivals,
    todayDepartures,
  });
});