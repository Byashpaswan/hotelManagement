const express = require('express');
const roomController = require('../../controller/roomController');
const { protect, authorize } = require('../../middlware/auth');
const { roomValidator, mongoIdValidator, paginationValidator } = require('../../middlware');

const router = express.Router();

router.use(protect);

router.get('/availability', paginationValidator, roomController.checkAvailability);
router.get('/stats', authorize('admin', 'manager'), roomController.getRoomStats);

router
  .route('/')
  .get(paginationValidator, roomController.getAllRooms)
  .post(authorize('admin', 'manager'), roomValidator, roomController.createRoom);

router
  .route('/:id')
  .get(mongoIdValidator(), roomController.getRoom)
  .patch(authorize('admin', 'manager'), mongoIdValidator(), roomController.updateRoom)
  .delete(authorize('admin'), mongoIdValidator(), roomController.deleteRoom);

router.patch('/:id/status', authorize('admin', 'manager', 'housekeeping'),
  mongoIdValidator(), roomController.updateRoomStatus);

module.exports = router;