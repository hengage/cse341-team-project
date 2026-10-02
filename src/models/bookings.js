import Booking from './schemas/bookings.js';

const createBooking = async (bookingData) => {
    const booking = new Booking(bookingData);
    await booking.save();
    return booking;
};

const getAllBookings = async () => {
    return await Booking.find({});
};

const getPaginatedBookings = async ({ page, limit }) => {
    const [totalItems, bookings] = await Promise.all([
        Booking.countDocuments({}),
        Booking.find({})
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
    ]);
    const totalPages = Math.ceil(totalItems / limit);

    return {
        bookings,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1 && totalItems > 0
        }
    };
};

const getBookingById = async (id) => {
    return await Booking.findOne({ id });
};

export { createBooking, getBookingById, getAllBookings, getPaginatedBookings };