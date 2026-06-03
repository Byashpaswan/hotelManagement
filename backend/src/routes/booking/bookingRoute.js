const express = require('express');
const bookingController = require('../../controller/bookingController');
const { protect, authorize } = require('../../middlware/auth');
const { bookingValidator, mongoIdValidator, paginationValidator } = require('../../middlware');

const router = express.Router();

router.use(protect);

router.get('/stats', authorize('admin', 'manager'), bookingController.getBookingStats);

router
  .route('/')
  .get(paginationValidator, bookingController.getAllBookings)
  .post(authorize('admin', 'manager', 'receptionist'), bookingValidator, bookingController.createBooking);

router
  .route('/:id')
  .get(mongoIdValidator(), bookingController.getBooking);

router.post('/:id/check-in', authorize('admin', 'manager', 'receptionist'),
  mongoIdValidator(), bookingController.checkIn);

router.post('/:id/check-out', authorize('admin', 'manager', 'receptionist'),
  mongoIdValidator(), bookingController.checkOut);

router.post('/:id/cancel', authorize('admin', 'manager', 'receptionist'),
  mongoIdValidator(), bookingController.cancelBooking);

router.post('/:id/payments', authorize('admin', 'manager', 'receptionist'),
  mongoIdValidator(), bookingController.addPayment);

module.exports = router;