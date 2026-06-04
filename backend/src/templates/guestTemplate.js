const guestTemplate = (booking) => {
  return `
    <h2>Booking Confirmed</h2>

    <p>Hello ${booking.guest.firstName}</p>

    <p>Your booking has been confirmed successfully.</p>

    <ul>
      <li>Room Number: ${booking.room.roomNumber}</li>
      <li>Check In: ${new Date(booking.checkIn).toDateString()}</li>
      <li>Check Out: ${new Date(booking.checkOut).toDateString()}</li>
      <li>Total Amount: ₹${booking.pricing.totalAmount}</li>
    </ul>

    <p>Thank you for choosing our hotel.</p>
  `;
};

module.exports = guestTemplate;