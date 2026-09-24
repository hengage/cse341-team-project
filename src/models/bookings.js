import Booking from './schemas/bookings.js';

const createBooking = async (bookingData) => {
    const booking = new Booking(bookingData);
    await booking.save();
    return booking;
};

const getAllBookings = async () => {
    return await Booking.find({});
};

const getBookingById = async (id) => {
    return await Booking.findOne({ id });
};

export { createBooking, getBookingById, getAllBookings };