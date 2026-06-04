const managerTemplate = (booking) => {
  return `
    <h2>New Booking Received</h2>

    <ul>
      <li>Guest Name: ${booking.guest.firstName}</li>
      <li>Email: ${booking.guest.email}</li>
      <li>Room: ${booking.room.roomNumber}</li>
      <li>Check In: ${new Date(booking.checkIn).toDateString()}</li>
      <li>Check Out: ${new Date(booking.checkOut).toDateString()}</li>
      <li>Total Amount: ₹${booking.pricing.totalAmount}</li>
    </ul>
  `;
};

module.exports = managerTemplate;