const Guest = require('../models/Guest');
const Booking = require('../models/Booking');
const factory = require('../services/factory');
const { catchAsync, sendResponse, AppError } = require('../utils/appError');

exports.getAllGuests = factory.getAll(Guest, ['firstName', 'lastName', 'email', 'phone']);
exports.getGuest = factory.getOne(Guest);
exports.createGuest = factory.createOne(Guest);
exports.updateGuest = factory.updateOne(Guest);
exports.deleteGuest = factory.deleteOne(Guest);

/**
 * Get guest's booking history.
 */
exports.getGuestBookings = catchAsync(async (req, res) => {
  const guest = await Guest.findById(req.params.id);
  if (!guest) throw new AppError('Guest not found.', 404);

  const bookings = await Booking.find({ guest: req.params.id })
    .populate('room', 'roomNumber type floor pricePerNight')
    .sort('-checkIn');

  sendResponse(res, 200, bookings, { results: bookings.length });
});

/**
 * Toggle guest blacklist status.
 */
exports.toggleBlacklist = catchAsync(async (req, res) => {
  const { isBlacklisted, blacklistReason } = req.body;
  const guest = await Guest.findByIdAndUpdate(
    req.params.id,
    { isBlacklisted, ...(isBlacklisted ? { blacklistReason } : { $unset: { blacklistReason: 1 } }) },
    { new: true }
  );
  if (!guest) throw new AppError('Guest not found.', 404);
  sendResponse(res, 200, guest);
});

/**
 * Guest statistics.
 */
exports.getGuestStats = catchAsync(async (req, res) => {
  const stats = await Guest.aggregate([
    {
      $group: {
        _id: '$vipStatus',
        count: { $sum: 1 },
        avgSpend: { $avg: '$totalSpent' },
        totalSpend: { $sum: '$totalSpent' },
      },
    },
    { $sort: { totalSpend: -1 } },
  ]);
  sendResponse(res, 200, stats);
});