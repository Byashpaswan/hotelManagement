const Room = require('../models/Room');
const Booking = require('../models/Booking');
const factory = require('../services/factory');
const { catchAsync, sendResponse, AppError } = require('../utils/appError');

exports.getAllRooms = factory.getAll(Room, ['roomNumber', 'type', 'description']);
exports.getRoom = factory.getOne(Room);
exports.createRoom = factory.createOne(Room);
exports.updateRoom = factory.updateOne(Room);
exports.deleteRoom = factory.deleteOne(Room);

/**
 * Check room availability for date range.
 */
exports.checkAvailability = catchAsync(async (req, res) => {
  const { checkIn, checkOut, type, adults = 1 } = req.query;

  if (!checkIn || !checkOut) throw new AppError('Check-in and check-out dates are required.', 400);

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (checkOutDate <= checkInDate) throw new AppError('Check-out must be after check-in.', 400);

  // Find rooms booked in the requested period
  const bookedRoomIds = await Booking.distinct('room', {
    status: { $in: ['pending', 'confirmed', 'checked_in'] },
    $or: [
      { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } },
    ],
  });

  const filter = {
    _id: { $nin: bookedRoomIds },
    status: 'available',
    'capacity.adults': { $gte: parseInt(adults) },
  };
  if (type) filter.type = type;

  const availableRooms = await Room.find(filter).sort('pricePerNight');
  sendResponse(res, 200, availableRooms, { results: availableRooms.length });
});

/**
 * Update room status (e.g., mark for cleaning/maintenance).
 */
exports.updateRoomStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { status, ...(status === 'cleaning' ? { lastCleaned: new Date() } : {}),
      ...(status === 'maintenance' ? { lastMaintenance: new Date() } : {}) },
    { new: true, runValidators: true }
  );
  if (!room) throw new AppError('Room not found.', 404);
  sendResponse(res, 200, room);
});

/**
 * Room occupancy statistics.
 */
exports.getRoomStats = catchAsync(async (req, res) => {
  const stats = await Room.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgPrice: { $avg: '$pricePerNight' },
        minPrice: { $min: '$pricePerNight' },
        maxPrice: { $max: '$pricePerNight' },
        available: { $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] } },
        occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const statusSummary = await Room.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  sendResponse(res, 200, { byType: stats, byStatus: statusSummary });
});