const express = require('express');
const guestController = require('../../controller/guestController');
const { protect, authorize } = require('../../middlware/auth');
const { guestValidator, mongoIdValidator, paginationValidator } = require('../../middlware');

const router = express.Router();

router.use(protect);

router.get('/stats', authorize('admin', 'manager'), guestController.getGuestStats);

router
  .route('/')
  .get(paginationValidator, guestController.getAllGuests)
  .post(authorize('admin', 'manager', 'receptionist'), guestValidator, guestController.createGuest);

router
  .route('/:id')
  .get(mongoIdValidator(), guestController.getGuest)
  .patch(authorize('admin', 'manager', 'receptionist'), mongoIdValidator(), guestController.updateGuest)
  .delete(authorize('admin'), mongoIdValidator(), guestController.deleteGuest);

router.get('/:id/bookings', mongoIdValidator(), guestController.getGuestBookings);
router.patch('/:id/blacklist', authorize('admin', 'manager'), mongoIdValidator(), guestController.toggleBlacklist);

module.exports = router;