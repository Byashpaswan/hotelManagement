const { getChannel } = require('../config/rabbitmq');

const QUEUE_NAME = 'booking-confirmed';

const publishBookingEvent = async (data) => {
  try {
    const channel = getChannel();

    await channel.assertQueue(QUEUE_NAME, {
      durable: true,
    });

    channel.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(data)),
      {
        persistent: true,
      }
    );

    console.log('Booking Event Published');
  } catch (error) {
    console.log(' Producer Error:', error);
  }
};

module.exports = publishBookingEvent;